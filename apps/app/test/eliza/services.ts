import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import https from "node:https";
import { type AddressInfo, createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { prepared } from "./checkout.ts";

/** What the model answers next: the pieces of a reply, or one piece and then nothing until the caller gives up. */
export type Reply = { readonly kind: "text"; readonly parts: readonly string[] } | { readonly kind: "stall"; readonly first: string };

/** The key a signed-in device holds: what the phone's native code keeps, hands the agent at launch, and adds to each request the page makes of the cloud. */
export interface DeviceKey {
  readonly token: string;
  readonly accountId: string;
  readonly organizationId: string;
  /** The code the cloud mailed this owner, which signed them in. */
  readonly mailed: string;
}

/**
 * The local eliza cloud: eliza's own cloud command (`elizaos-cloud serve`) over a database of this run, with its
 * staging mailbox, an operator who funds each owner, and, where a real deployment has a model provider and a payment
 * provider, a scripted model and a read-only catalog of the two plans.
 */
export interface Cloud {
  /** The https origin the agent calls, and the certificate authority it must trust for it: an agent takes no other kind of origin. */
  readonly api: string;
  readonly caFile: string;
  /** The cloud's own listener, plain HTTP on loopback: what the page's proxy and the journeys call. */
  readonly local: string;
  /** Where the scripted model is told what to say and asked what it heard (`/operator/model`, `/operator/asked`). */
  readonly provider: string;
  /** Each owner the cloud was started with, by email: signed in by the mailed code, with a device key, and funded. */
  readonly owners: ReadonlyMap<string, DeviceKey>;
  stop(): Promise<void>;
}

/** The resident agent, as one Node process: its loopback origin and the bearer token of this launch. */
export interface Agent {
  readonly origin: string;
  readonly token: string;
  stop(): Promise<void>;
}

const node = process.execPath;
const base64url = (bytes: Buffer) => bytes.toString("base64url");
/** The one model the local cloud offers, as the agent's launch and the cloud's profile both name it. */
const model = "alpha-chat";
/** Alpha as the cloud's staging registry knows it: the client a device signs in as. */
const client = { clientId: "ai.alpha.phone", displayName: "Alpha", androidPackage: "ai.alpha.phone", certFingerprints: [Array.from({ length: 32 }, () => "AA").join(":")] };

/** A directory only this user reads, as the agent demands of its state. */
function owned(directory: string) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  return directory;
}

/** A fresh state directory, for one run. */
export const scratch = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "alpha-eliza-")));

const children = new Set<ChildProcess>();
process.once("exit", () => { for (const child of children) child.kill("SIGKILL"); });

function ended(child: ChildProcess) {
  return new Promise<void>((done) => {
    children.delete(child);
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

const listening = (server: http.Server) => new Promise<number>((done) => server.listen(0, "127.0.0.1", () => done((server.address() as AddressInfo).port)));

interface Answer { readonly status: number; readonly text: string }

/** One exchange over node:http, and not fetch: a journey's page replaces fetch with its own, which keeps to the page's origin. */
function exchange(url: string, init: { method?: string; headers?: Record<string, string>; body?: unknown; within?: number } = {}): Promise<Answer> {
  return new Promise((done, fail) => {
    const body = init.body === undefined ? undefined : JSON.stringify(init.body);
    const request = http.request(url, { method: init.method ?? (body === undefined ? "GET" : "POST"), headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...init.headers } }, (response) => {
      let text = "";
      response.setEncoding("utf8").on("data", (part: string) => { text += part; }).on("end", () => done({ status: response.statusCode ?? 0, text }));
    });
    if (init.within !== undefined) request.setTimeout(init.within, () => request.destroy(new Error("no answer in time")));
    request.on("error", fail).end(body);
  });
}

/** Wait until `url` answers 200: a service that has only just bound its port may take a connection and never answer it. */
async function answering(url: string, gone: () => string | undefined) {
  while (!(await exchange(url, { within: 2_000 }).then((answer) => answer.status === 200, () => false))) {
    const why = gone();
    if (why !== undefined) throw new Error(why);
    await new Promise((done) => setTimeout(done, 100));
  }
}

export async function said<A>(url: string, init?: Parameters<typeof exchange>[1]): Promise<A> {
  const answer = await exchange(url, init);
  if (answer.status < 200 || answer.status >= 300) throw new Error(`${url} answered ${answer.status} ${answer.text}`);
  return (answer.text === "" ? undefined : JSON.parse(answer.text)) as A;
}

interface Message { readonly role: string; readonly content?: unknown }

/** The two plans the cloud sells, as its payment provider's catalog lists them: the cloud checks them before it serves billing. */
const plans = { plus_monthly: { priceId: "price_plus", productId: "prod_plus", unitAmount: 3_000 }, pro_monthly: { priceId: "price_pro", productId: "prod_pro", unitAmount: 10_000 } };
const paymentKey = "sk_test_local";

/** The payment provider's catalog, read-only: a price or a product of `plans`, as Stripe's API answers one. */
function catalogued(route: string, authorization: string | undefined): [number, unknown] {
  if (authorization !== `Bearer ${paymentKey}`) return [401, { error: { type: "invalid_request_error" } }];
  for (const { priceId, productId, unitAmount } of Object.values(plans)) {
    if (route === `/v1/prices/${priceId}`) {
      return [200, {
        id: priceId, object: "price", active: true, currency: "usd", unit_amount: unitAmount, type: "recurring", billing_scheme: "per_unit", transform_quantity: null,
        livemode: false, product: productId, recurring: { interval: "month", interval_count: 1, trial_period_days: null, usage_type: "licensed" },
      }];
    }
    if (route === `/v1/products/${productId}`) return [200, { id: productId, object: "product", active: true, livemode: false }];
  }
  return [404, { error: { type: "invalid_request_error", message: "no such object" } }];
}

/**
 * The model provider a deployment's cloud pays: an OpenAI-compatible `chat/completions`, which says what a journey
 * scripted, or repeats the owner's last message, and reports the tokens it is paid for. An agent is told apart by
 * its character's system prompt, so journeys share one cloud.
 */
async function startProvider(key: string) {
  const replies = new Map<string, Reply[]>();
  const asked = new Map<string, Message[][]>();
  const listed = <A>(lists: Map<string, A[]>, system: string) => lists.get(system) ?? lists.set(system, []).get(system)!;
  const frame = (data: unknown) => `data: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`;
  const usage = (messages: readonly Message[], text: string) => ({ prompt_tokens: JSON.stringify(messages).length, completion_tokens: text.length, total_tokens: JSON.stringify(messages).length + text.length });
  const json = (outgoing: ServerResponse, status: number, data: unknown) => void outgoing.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(data));
  async function read(incoming: IncomingMessage) {
    let text = "";
    for await (const part of incoming.setEncoding("utf8")) text += part as string;
    return text === "" ? {} : JSON.parse(text) as Record<string, unknown>;
  }
  function completed(input: Record<string, unknown>, outgoing: ServerResponse) {
    const messages = (input.messages ?? []) as Message[];
    const character = messages.find((message) => message.role === "system")?.content;
    const system = typeof character === "string" ? character : "";
    listed(asked, system).push(messages);
    const last = messages.findLast((message) => message.role === "user")?.content;
    const reply = listed(replies, system).shift() ?? { kind: "text", parts: ["You said: ", typeof last === "string" ? last : JSON.stringify(last)] };
    const text = reply.kind === "text" ? reply.parts.join("") : reply.first;
    const named = { id: "chatcmpl-local", created: 1_790_000_000, model: input.model };
    if (input.stream !== true) {
      return json(outgoing, 200, { ...named, object: "chat.completion", choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }], usage: usage(messages, text) });
    }
    const piece = (delta: object, finish: string | null) => frame({ ...named, object: "chat.completion.chunk", choices: [{ index: 0, delta, finish_reason: finish }] });
    outgoing.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store" }).flushHeaders();
    outgoing.write(piece({ role: "assistant", content: "" }, null));
    for (const part of reply.kind === "text" ? reply.parts : [reply.first]) outgoing.write(piece({ content: part }, null));
    if (reply.kind === "stall") return;
    outgoing.write(piece({}, "stop"));
    outgoing.write(frame({ ...named, object: "chat.completion.chunk", choices: [], usage: usage(messages, text) }));
    outgoing.end(frame("[DONE]"));
  }
  const server = http.createServer((incoming, outgoing) => void (async () => {
    const url = new URL(incoming.url ?? "/", "http://provider");
    if (url.pathname === "/operator/model") {
      const body = await read(incoming);
      return json(outgoing, 200, { scripted: listed(replies, String(body.system)).push(body.reply as Reply) });
    }
    if (url.pathname === "/operator/asked") return json(outgoing, 200, listed(asked, url.searchParams.get("system") ?? ""));
    if (url.pathname.startsWith("/stripe/")) return json(outgoing, ...catalogued(url.pathname.slice("/stripe".length), incoming.headers.authorization));
    if (incoming.method !== "POST" || url.pathname !== "/v1/chat/completions") return json(outgoing, 404, { error: { type: "invalid_request_error", message: "no such route" } });
    if (incoming.headers.authorization !== `Bearer ${key}`) return json(outgoing, 401, { error: { type: "authentication_error", message: "bad key" } });
    completed(await read(incoming), outgoing);
  })().catch((cause: unknown) => json(outgoing, 500, { error: String(cause) })));
  const origin = `http://127.0.0.1:${await listening(server)}`;
  return { origin, stop: () => new Promise<void>((done) => { server.close(() => done()); server.closeAllConnections(); }) };
}

/** An https listener in front of `upstream`, under a certificate made for this run: the agent calls its cloud only over https. */
async function startFront(state: string, upstream: URL) {
  const [config, keyFile, caFile] = ["leaf.cnf", "leaf.key", "leaf.pem"].map((name) => path.join(state, name)) as [string, string, string];
  fs.writeFileSync(config, [
    "[req]", "prompt = no", "distinguished_name = subject", "x509_extensions = ext", "[subject]", "CN = localhost",
    "[ext]", "basicConstraints = critical, CA:TRUE", "keyUsage = critical, digitalSignature, keyCertSign",
    "extendedKeyUsage = serverAuth", "subjectAltName = DNS:localhost, IP:127.0.0.1", "",
  ].join("\n"));
  execFileSync("openssl", ["req", "-x509", "-newkey", "ec", "-pkeyopt", "ec_paramgen_curve:prime256v1", "-nodes", "-days", "30", "-config", config, "-keyout", keyFile, "-out", caFile], { stdio: "ignore" });
  const front = https.createServer({ key: fs.readFileSync(keyFile), cert: fs.readFileSync(caFile) }, (incoming, outgoing) => {
    const forwarded = http.request(upstream, { method: incoming.method, path: incoming.url, headers: { ...incoming.headers, host: upstream.host } }, (answer) => {
      outgoing.writeHead(answer.statusCode ?? 502, answer.headers);
      answer.pipe(outgoing);
    });
    forwarded.on("error", () => (outgoing.headersSent ? outgoing.destroy() : outgoing.writeHead(502).end()));
    outgoing.on("close", () => forwarded.destroy());
    incoming.pipe(forwarded);
  });
  const api = `https://localhost:${await listening(front)}`;
  return { api, caFile, stop: () => new Promise<void>((done) => { front.close(() => done()); front.closeAllConnections(); }) };
}

/** eliza's cloud command with `args`, from the pinned checkout's build: what it printed, and when it ended. */
function cloudCommand(secrets: string, args: readonly string[]) {
  const child = spawn(node, ["--no-warnings", `--env-file=${secrets}`, "dist/src/main.js", ...args], { cwd: prepared().cloud, env: { PATH: process.env.PATH, TZ: "UTC" }, stdio: ["ignore", "pipe", "pipe"] });
  children.add(child);
  let output = "";
  for (const stream of [child.stdout, child.stderr]) stream.setEncoding("utf8").on("data", (text: string) => { output += text; });
  const exited = new Promise<number | null>((done) => child.once("close", (code) => { children.delete(child); done(code); }));
  return { child, exited, output: () => output };
}

async function served(secrets: string, args: readonly string[], origin: string) {
  const running = cloudCommand(secrets, ["serve", ...args]);
  let over = false;
  void running.exited.then(() => { over = true; });
  await answering(`${origin}/api/public/service`, () => (over ? `the cloud stopped before it served: ${running.output()}` : undefined));
  return running.child;
}

const challenged = () => {
  const verifier = base64url(randomBytes(32));
  return { verifier, challenge: base64url(createHash("sha256").update(verifier, "ascii").digest()) };
};

/**
 * Sign `email` in by the code the cloud mails, and pair a device, as the phone's native code does: the code from the
 * staging mailbox, then a device grant redeemed and acknowledged. The whole of sign-in, with no one to type the code.
 */
async function signIn(local: string, email: string, signInReturn: string): Promise<DeviceKey> {
  const call = <A>(route: string, body?: unknown, credential?: string) => said<A>(`${local}${route}`, { body, headers: credential === undefined ? {} : { authorization: `Bearer ${credential}` } });
  const first = challenged();
  await call("/api/v1/auth/email/code/send", { email, clientId: client.clientId, codeChallenge: first.challenge, codeChallengeMethod: "S256" });
  const mailed = /\b(\d{6})\b/.exec((await call<{ text: string }>(`/api/test/inbox/${encodeURIComponent(email)}`)).text)?.[1] ?? "";
  const signed = await call<{ accessToken: string; organizationId: string; user: { id: string } }>("/api/v1/auth/email/code/verify", { email, code: mailed, clientId: client.clientId, codeVerifier: first.verifier });
  const binding = { clientId: client.clientId, environment: "staging", redirectUri: signInReturn };
  const second = challenged();
  const state = base64url(randomBytes(32));
  const connected = await call<{ code: string }>("/api/v1/app-auth/connect", { ...binding, flow: "mobile_pkce", state, codeChallenge: second.challenge, codeChallengeMethod: "S256" }, signed.accessToken);
  const redeemed = { ...binding, code: connected.code, state, codeVerifier: second.verifier };
  const minted = await call<{ credentialId: string; secret: string }>("/api/v1/app-auth/mobile/token", { ...redeemed, grantType: "authorization_code" });
  await call("/api/v1/app-auth/mobile/ack", { ...redeemed, credentialId: minted.credentialId, secret: minted.secret });
  return { token: minted.secret, accountId: signed.user.id, organizationId: signed.organizationId, mailed };
}

/**
 * Start eliza's cloud over `state` with each of `emails` signed in, paired and given `credits`. The operator's
 * command needs the database to itself, so every owner of a run is made before the cloud serves that run: the cloud
 * serves once to sign them in, stops, is funded, and serves again at the same address.
 */
export async function startCloud(state: string, emails: readonly string[], credits: number): Promise<Cloud> {
  const home = owned(path.join(state, "cloud"));
  const fixture = (name: string) => fs.readFileSync(path.join(prepared().cloud, "test/fixtures", name), "utf8");
  const file = (name: string, text: string) => { fs.writeFileSync(path.join(home, name), text, { mode: 0o600 }); return path.join(home, name); };
  const providerKey = base64url(randomBytes(24));
  const provider = await startProvider(providerKey);
  const profile = JSON.parse(fixture("profile.json")) as { environments: { staging: { web: string } & Record<string, unknown> } };
  const { web } = profile.environments.staging;
  profile.environments.staging = {
    ...profile.environments.staging,
    capabilities: ["inference", "billing"],
    billing: {
      apiUrl: `${provider.origin}/stripe`, secretKeyEnv: "STRIPE_SECRET_KEY", webhookSecretEnv: "STRIPE_WEBHOOK_SECRET", publishableKey: "pk_test_local",
      plans: Object.fromEntries(Object.entries(plans).map(([plan, { priceId, productId }]) => [plan, { priceId, productId }])),
    },
    inference: { providers: [{ id: "scripted", baseUrl: `${provider.origin}/v1`, apiKeyEnv: "CLOUD_UPSTREAM_KEY" }], models: [{ id: model, provider: "scripted", upstreamModel: model, vision: false, defaultMaxTokens: 1024 }] },
  };
  const signInReturn = `${web}/apps/alpha/sign-in`;
  const seed = { clients: [{ ...client, signInReturn, billingReturn: `${web}/apps/alpha/billing`, connectReturn: `${web}/apps/alpha/connect` }], prices: [{ modelId: model, inputPer1K: 150, outputPer1K: 600 }] };
  const secrets = file("secrets.env", `${fixture("secrets.env")}\nCLOUD_UPSTREAM_KEY=${providerKey}\nSTRIPE_SECRET_KEY=${paymentKey}\nSTRIPE_WEBHOOK_SECRET=whsec_local\n`);
  const deployment = ["--profile", file("profile.json", JSON.stringify(profile)), "--environment", "staging", "--store", `pglite:${path.join(home, "cloud.pglite")}`];
  const port = await freePort();
  const local = `http://127.0.0.1:${port}`;
  const at = [...deployment, "--port", String(port), "--host", "127.0.0.1"];
  const owners = new Map<string, DeviceKey>();
  try {
    const first = await served(secrets, [...at, "--seed", file("seed.json", JSON.stringify(seed))], local);
    try {
      for (const email of emails) owners.set(email, await signIn(local, email, signInReturn));
    } finally {
      await ended(first);
    }
    for (const [email, key] of owners) {
      const funded = cloudCommand(secrets, ["credits", "add", "--organization", key.organizationId, "--amount", String(credits), "--request", `grant-${email}`, ...deployment]);
      if (await funded.exited !== 0) throw new Error(`the operator could not fund ${email}: ${funded.output()}`);
    }
    const running = await served(secrets, at, local);
    const front = await startFront(home, new URL(local));
    return { api: front.api, caFile: front.caFile, local, provider: provider.origin, owners, stop: async () => { await front.stop(); await ended(running); await provider.stop(); } };
  } catch (cause) {
    await provider.stop();
    throw cause;
  }
}

/** The character of the agent of `email`: its system prompt names its owner, which is also how the local cloud's model tells one journey's agent from another's. */
export const characterOf = (email: string) => ({ name: "Alpha", system: `You are Alpha, the phone agent of ${email}.` });

/** The modules of eliza's agent Alpha's launch loads beside conversations: each serves the routes an area reads (`.eliza/packages/agent/src/plugins/profile.vibe`). */
export const modules = ["approvals", "notifications", "reply-draft", "scheduled-tasks", "triggers", "tasks", "surface"].map((name) => `@elizaos/agent/${name}`);

/** Start the agent bundle of the pinned checkout as the owner's, over `state`, with `key` as its cloud credential; `persist` keeps its conversations in `state`. */
export async function startAgent(state: string, cloud: Cloud, key: DeviceKey, character: { name: string; system: string }, persist: boolean): Promise<Agent> {
  const launch = path.join(owned(state), "launch.json");
  fs.writeFileSync(launch, JSON.stringify({
    schema: 1,
    character,
    policy: { actions: { allowed: ["REPLY", "IGNORE", "NONE"] }, plugins: { load: modules } },
    model: { backend: "cloud", cloudBaseUrl: cloud.api, smallModel: model, largeModel: model, imageModel: model },
    account: { userId: key.accountId, organizationId: key.organizationId },
    embeddings: "none", persistMemory: persist, callerRole: "owner",
  }), { mode: 0o600 });
  const token = base64url(randomBytes(32));
  const port = await freePort();
  const home = owned(path.join(state, "agent"));
  const child = spawn(node, [path.join(prepared().bundle, "agent.mjs"), "serve", "--launch", launch, "--state", home, "--http", `127.0.0.1:${port}`], {
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: home, TZ: "UTC", NODE_EXTRA_CA_CERTS: cloud.caFile },
    stdio: ["pipe", "ignore", "pipe"],
  });
  children.add(child);
  let errors = "";
  child.stderr.setEncoding("utf8").on("data", (text: string) => { errors += text; });
  child.stdin.end(`${JSON.stringify({ version: 1, token, epoch: Date.now(), credential: { version: 1, value: key.token }, storageKey: base64url(randomBytes(32)) })}\n`);
  const origin = `http://127.0.0.1:${port}`;
  await answering(`${origin}/api/health`, () => (child.exitCode === null ? undefined : `the agent stopped with ${child.exitCode}: ${errors}`));
  return { origin, token, stop: () => ended(child) };
}

/** The owner the dev server signs in, and what the operator grants: enough for a day of talking to a scripted model. */
const owner = { email: "owner@alpha.test", credits: 50_000_000 };

/**
 * The cloud and the agent a dev server runs against: one signed-in, funded owner. Their state is a directory of this
 * run, gone with it, so nothing piles up between runs; `keep` names a directory to keep the agent's in instead.
 */
export async function startEliza(keep?: string) {
  const state = scratch();
  const cloud = await startCloud(state, [owner.email], owner.credits);
  const key = cloud.owners.get(owner.email)!;
  const agent = await startAgent(keep ?? state, cloud, key, characterOf(owner.email), keep !== undefined);
  return { cloud, agent, key, stop: async () => { await agent.stop(); await cloud.stop(); fs.rmSync(state, { recursive: true, force: true }); } };
}
