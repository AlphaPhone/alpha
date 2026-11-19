import { type ChildProcess, spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import { type AddressInfo, createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { prepared } from "./checkout.ts";
import type { CloudAddress, Reply } from "./cloud-host.ts";

/** The local eliza cloud: the Worker over its own database, with a mailbox, a scripted model and an operator. */
export interface Cloud extends CloudAddress {
  /** Every sign-in mail sent so far. */
  mail(): Promise<{ to: string; text: string }[]>;
  /** What the model says to the next call, in place of repeating the owner. */
  script(reply: Reply): Promise<void>;
  /** The messages of every model call so far. */
  asked(): Promise<{ role: string; content?: unknown }[][]>;
  /** The operator adds credits, once per `requestKey`. */
  credit(organizationId: string, amount: number, requestKey: string): Promise<void>;
  ledger(organizationId: string): Promise<{ balance: number; charges: { charged: number; outcome: string }[] }>;
  stop(): Promise<void>;
}

/** The key a signed-in device holds: what the phone's native code keeps, and hands the agent at launch. */
export interface DeviceKey {
  readonly token: string;
  readonly accountId: string;
  readonly organizationId: string;
}

/** The resident agent, as one Node process: its loopback origin and the bearer token of this launch. */
export interface Agent {
  readonly origin: string;
  readonly token: string;
  stop(): Promise<void>;
}

const node = process.execPath;
const base64url = (bytes: Buffer) => bytes.toString("base64url");

/** A directory only this user reads, as the agent demands of its state. */
function owned(directory: string) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  return directory;
}

/** A fresh state directory, for one test file. */
export const scratch = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "alpha-eliza-")));

function ended(child: ChildProcess) {
  return new Promise<void>((done) => {
    if (child.exitCode !== null || child.signalCode !== null) return done();
    child.once("close", () => done());
    child.kill("SIGTERM");
  });
}

async function freePort() {
  const server = createServer();
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const { port } = server.address() as AddressInfo;
  await new Promise((done) => server.close(done));
  return port;
}

interface Answer { readonly status: number; readonly cookies: readonly string[]; readonly text: string }

/** One exchange over node:http, and not fetch: a journey's page replaces fetch with its own, which keeps to the page's origin. */
function exchange(url: string, init: { method?: string; headers?: Record<string, string>; body?: unknown } = {}): Promise<Answer> {
  return new Promise((done, fail) => {
    const body = init.body === undefined ? undefined : JSON.stringify(init.body);
    const request = http.request(url, { method: init.method ?? (body === undefined ? "GET" : "POST"), headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...init.headers } }, (response) => {
      let text = "";
      response.setEncoding("utf8").on("data", (part: string) => { text += part; }).on("end", () => done({ status: response.statusCode ?? 0, cookies: response.headers["set-cookie"] ?? [], text }));
    });
    request.on("error", fail).end(body);
  });
}

async function said<A>(url: string, init?: Parameters<typeof exchange>[1]): Promise<A> {
  const answer = await exchange(url, init);
  if (answer.status < 200 || answer.status >= 300) throw new Error(`${url} answered ${answer.status} ${answer.text}`);
  return (answer.text === "" ? undefined : JSON.parse(answer.text)) as A;
}

/** Start the cloud Worker of the pinned checkout over `state`, on free ports. */
export async function startCloud(state: string): Promise<Cloud> {
  const child = spawn(node, [path.join(import.meta.dirname, "cloud-host.ts"), prepared().cloud, owned(path.join(state, "cloud"))], { stdio: ["pipe", "pipe", "pipe"] });
  let errors = "";
  child.stderr.setEncoding("utf8").on("data", (text: string) => { errors += text; });
  const address = await new Promise<CloudAddress>((done, fail) => {
    child.stdout.setEncoding("utf8").once("data", (line: string) => done(JSON.parse(line) as CloudAddress));
    child.once("close", (code) => fail(new Error(`the cloud stopped with ${code}: ${errors}`)));
  });
  const operator = <A>(route: string, body?: unknown) => said<A>(`${address.local}/operator/${route}`, { body });
  return {
    ...address,
    mail: () => operator("mail"),
    script: (reply) => operator("model", reply),
    asked: () => operator("asked"),
    credit: (organizationId, amount, requestKey) => operator("credits", { organizationId, amount, requestKey }),
    ledger: (organizationId) => operator(`ledger?organizationId=${organizationId}`),
    stop: () => ended(child),
  };
}

/** The code the cloud last mailed to `email`. */
export async function mailedCode(cloud: Cloud, email: string) {
  const text = (await cloud.mail()).findLast((message) => message.to === email)?.text ?? "";
  return /code is (\d{6})/.exec(text)?.[1] ?? "";
}

/** What a device asks a signed-in browser to authorize: a challenge, whose verifier never leaves the device. */
export function deviceChallenge() {
  const verifier = base64url(randomBytes(48));
  return { verifier, challenge: base64url(createHash("sha256").update(verifier).digest()), state: base64url(randomBytes(32)) };
}

/** The device's half of sign-in, as the phone's native code does it: exchange the grant the browser was given, and acknowledge the key. */
export async function redeem(cloud: Cloud, redirectUrl: string, verifier: string): Promise<DeviceKey> {
  const code = new URL(redirectUrl).searchParams.get("code");
  const key = await said<DeviceKey>(`${cloud.local}/api/auth/device/exchange`, { body: { code, verifier } });
  await said(`${cloud.local}/api/auth/device/ack`, { method: "POST", headers: { authorization: `Bearer ${key.token}` } });
  return key;
}

/** Sign `email` in by the code the cloud mails, and pair a device: the whole of sign-in, for a dev server with no one to type the code. */
export async function signIn(cloud: Cloud, email: string): Promise<DeviceKey> {
  const jar = new Map<string, string>();
  const browser = async <A>(route: string, body: unknown) => {
    const answer = await exchange(`${cloud.local}${route}`, { body, headers: { origin: cloud.web, cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; ") } });
    if (answer.status < 200 || answer.status >= 300) throw new Error(`${route} answered ${answer.status} ${answer.text}`);
    for (const cookie of answer.cookies) {
      const [pair = ""] = cookie.split(";");
      jar.set(pair.slice(0, pair.indexOf("=")), pair.slice(pair.indexOf("=") + 1));
    }
    return (answer.text === "" ? undefined : JSON.parse(answer.text)) as A;
  };
  await browser("/api/auth/email/send", { email });
  await browser("/api/auth/email/verify", { email, code: await mailedCode(cloud, email) });
  const { verifier, challenge, state } = deviceChallenge();
  const { redirectUrl } = await browser<{ redirectUrl: string }>("/api/auth/device/authorize", { challenge, state });
  return redeem(cloud, redirectUrl, verifier);
}

/** Start the agent bundle of the pinned checkout as the owner's, over `state`, with `key` as its cloud credential. */
export async function startAgent(state: string, cloud: Cloud, key: DeviceKey): Promise<Agent> {
  const launch = path.join(owned(state), "launch.json");
  fs.writeFileSync(launch, JSON.stringify({
    schema: 1,
    character: { name: "Alpha", system: "You are Alpha, the owner's phone agent." },
    policy: { actions: { allowed: ["REPLY", "IGNORE", "NONE"] }, plugins: { load: [] } },
    model: { backend: "cloud", cloudBaseUrl: cloud.api, smallModel: "alpha-chat", largeModel: "alpha-chat", imageModel: "alpha-chat" },
    account: { userId: key.accountId, organizationId: key.organizationId },
    embeddings: "none", persistMemory: true, callerRole: "owner",
  }), { mode: 0o600 });
  const token = base64url(randomBytes(32));
  const port = await freePort();
  const home = owned(path.join(state, "agent"));
  const child = spawn(node, [path.join(prepared().bundle, "agent.mjs"), "serve", "--launch", launch, "--state", home, "--http", `127.0.0.1:${port}`], {
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: home, TZ: "UTC", NODE_EXTRA_CA_CERTS: cloud.caFile },
    stdio: ["pipe", "ignore", "pipe"],
  });
  let errors = "";
  child.stderr.setEncoding("utf8").on("data", (text: string) => { errors += text; });
  child.stdin.end(`${JSON.stringify({ version: 1, token, epoch: Date.now(), credential: { version: 1, value: key.token } })}\n`);
  const origin = `http://127.0.0.1:${port}`;
  while (!(await exchange(`${origin}/api/health`).then((answer) => answer.status === 200, () => false))) {
    if (child.exitCode !== null) throw new Error(`the agent stopped with ${child.exitCode}: ${errors}`);
    await new Promise((done) => setTimeout(done, 50));
  }
  return { origin, token, stop: () => ended(child) };
}

/** The owner the dev server signs in, and what the operator grants: enough for a day of talking to a scripted model. */
const owner = { email: "owner@alpha.test", credits: 50_000_000 };

/** The cloud and the agent a dev server runs against: one signed-in, funded owner over `state`, kept between runs. */
export async function startEliza(state: string) {
  const cloud = await startCloud(state);
  const key = await signIn(cloud, owner.email);
  await cloud.credit(key.organizationId, owner.credits, "dev-grant");
  const agent = await startAgent(state, cloud, key);
  return { cloud, agent, key, stop: async () => { await agent.stop(); await cloud.stop(); } };
}
