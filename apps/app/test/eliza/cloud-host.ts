import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import https from "node:https";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as NodeStream } from "node:stream/web";
import { pathToFileURL } from "node:url";
import type * as Worker from "@elizaos/cloud/worker";

/** What the model answers next: the pieces of a reply, or one piece and then nothing until the caller gives up. */
export type Reply = { readonly kind: "text"; readonly parts: readonly string[] } | { readonly kind: "stall"; readonly first: string };

/** What this process prints, once, when the cloud answers. */
export interface CloudAddress {
  /** The https origin the agent calls, and the certificate authority it must trust for it. */
  readonly api: string;
  readonly caFile: string;
  /** The same Worker over plain HTTP on loopback, for the page's proxy and the tests, with the operator's routes under `/operator`. */
  readonly local: string;
  /** The origin a signed-in browser names: the cloud admits a native return address only on an https origin with no port. */
  readonly web: string;
}

interface Mail { readonly to: string; readonly text: string }
interface Pg { query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>; exec(sql: string): Promise<unknown>; close(): Promise<void> }
interface Socket { start(): Promise<void>; stop(): Promise<void>; getServerConn(): string }
interface Message { readonly role: string; readonly content?: unknown }

const [cloud = "", state = ""] = process.argv.slice(2);
const built = (file: string) => pathToFileURL(path.join(cloud, "dist/src", file)).href;

function entry(name: string) {
  const directory = path.join(cloud, "node_modules", name);
  const main = (JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf8")) as { exports: { ".": string | { import: string | { default: string } } } }).exports["."];
  return pathToFileURL(path.join(directory, typeof main === "string" ? main : typeof main.import === "string" ? main.import : main.import.default)).href;
}

const { PGlite } = await import(entry("@electric-sql/pglite")) as { PGlite: { create: (directory?: string) => Promise<Pg> } };
const { PGLiteSocketServer } = await import(entry("@electric-sql/pglite-socket")) as { PGLiteSocketServer: new (options: { db: Pg; host: string; port: number; maxConnections: number }) => Socket };
const { Effect } = await import(entry("effect")) as { Effect: { runPromise: <A>(effect: unknown) => Promise<A>; provide: (effect: unknown, layer: unknown) => unknown } };
const { migrate, storeLayer } = await import(built("store/store.js")) as { migrate: (options: { digest: string; environment: "staging"; now: number }) => unknown; storeLayer: (location: { kind: "pg"; url: string }) => unknown };
const { addCredits } = await import(built("billing/funds.js")) as { addCredits: (input: { organizationId: string; amount: number; requestKey: string }) => unknown };
const { cloudWorker } = await import(built("worker.js")) as typeof Worker;

function certificate() {
  const [config, keyFile, caFile] = ["leaf.cnf", "leaf.key", "leaf.pem"].map((name) => path.join(state, name)) as [string, string, string];
  fs.writeFileSync(config, [
    "[req]", "prompt = no", "distinguished_name = subject", "x509_extensions = ext", "[subject]", "CN = localhost",
    "[ext]", "basicConstraints = critical, CA:TRUE", "keyUsage = critical, digitalSignature, keyCertSign",
    "extendedKeyUsage = serverAuth", "subjectAltName = DNS:localhost, IP:127.0.0.1", "",
  ].join("\n"));
  execFileSync("openssl", ["req", "-x509", "-newkey", "ec", "-pkeyopt", "ec_paramgen_curve:prime256v1", "-nodes", "-days", "30", "-config", config, "-keyout", keyFile, "-out", caFile], { stdio: "ignore" });
  return { key: fs.readFileSync(keyFile), cert: fs.readFileSync(caFile), caFile };
}

const listening = (server: http.Server) => new Promise<number>((done) => server.listen(0, "127.0.0.1", () => done((server.address() as AddressInfo).port)));

const database = await PGlite.create(path.join(state, "cloud-db"));
const socket = new PGLiteSocketServer({ db: database, host: "127.0.0.1", port: 0, maxConnections: 8 });
await socket.start();
const databaseUrl = `postgresql://postgres:postgres@${socket.getServerConn()}/postgres`;
const store = storeLayer({ kind: "pg", url: databaseUrl });
const digest = "a".repeat(64);
await Effect.runPromise(Effect.provide(migrate({ digest, environment: "staging", now: Date.now() }), store));

const mail: Mail[] = [];
/** What the model says next to each agent, and what each asked it: an agent is told apart by its character's system prompt, so journeys share one cloud. */
const replies = new Map<string, Reply[]>();
const asked = new Map<string, Message[][]>();
const listed = <A>(lists: Map<string, A[]>, system: string) => lists.get(system) ?? lists.set(system, []).get(system)!;
const encoder = new TextEncoder();
const chunk = (data: unknown) => encoder.encode(`data: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`);
const usage = (messages: readonly Message[], said: string) => ({ prompt_tokens: JSON.stringify(messages).length, completion_tokens: said.length });

/** The model binding: it says what the test scripted, or repeats the owner's last message, and reports the tokens it is paid for. */
function model(name: string, input: Record<string, unknown>, options: { signal: AbortSignal }): Promise<Response> {
  const messages = (input.messages ?? []) as Message[];
  const character = messages.find((message) => message.role === "system")?.content;
  const system = typeof character === "string" ? character : "";
  listed(asked, system).push(messages);
  const last = messages.findLast((message) => message.role === "user")?.content;
  const reply = listed(replies, system).shift() ?? { kind: "text", parts: ["You said: ", typeof last === "string" ? last : JSON.stringify(last)] };
  const said = reply.kind === "text" ? reply.parts.join("") : reply.first;
  if (input.stream !== true) {
    return Promise.resolve(Response.json({ id: "local", object: "chat.completion", model: name, choices: [{ index: 0, message: { role: "assistant", content: said }, finish_reason: "stop" }], usage: usage(messages, said) }));
  }
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const part of reply.kind === "text" ? reply.parts : [reply.first]) controller.enqueue(chunk({ choices: [{ index: 0, delta: { content: part } }] }));
      if (reply.kind === "stall") return void options.signal.addEventListener("abort", () => controller.error(options.signal.reason), { once: true });
      controller.enqueue(chunk({ choices: [], usage: usage(messages, said) }));
      controller.enqueue(chunk("[DONE]"));
      controller.close();
    },
  });
  return Promise.resolve(new Response(body, { headers: { "content-type": "text/event-stream" } }));
}

const tls = certificate();
const secure = https.createServer({ key: tls.key, cert: tls.cert }, (incoming, outgoing) => void served(incoming, outgoing));
const api = `https://localhost:${await listening(secure)}`;
const plain = http.createServer((incoming, outgoing) => void (incoming.url?.startsWith("/operator/")
  ? operated(incoming, outgoing).catch((cause: unknown) => answered(Response.json({ error: String(cause) }, { status: 500 }), outgoing))
  : served(incoming, outgoing)));
const web = "https://alpha.test";
const address: CloudAddress = { api, caFile: tls.caFile, local: `http://127.0.0.1:${await listening(plain)}`, web };

const env = {
  CLOUD_ENVIRONMENT: "staging", CLOUD_IDENTITY_DIGEST: digest, DATABASE_URL: databaseUrl,
  PUBLIC_API_ORIGIN: api, WEB_ORIGIN: web, NATIVE_CLIENT_ID: "ai.alpha.phone", NATIVE_AUTH_CALLBACK: `${web}/native/auth`,
  NATIVE_CLIENT_REGISTRY: JSON.stringify([{
    clientId: "ai.alpha.phone", environment: "staging", displayName: "Alpha", androidPackage: "ai.alpha.phone",
    certFingerprints: [Array.from({ length: 32 }, () => "AA").join(":")], signInReturn: `${web}/native/auth`, billingReturn: `${web}/native/billing`,
    credentialTtlMs: 30 * 86_400_000, nativeGoogle: false, enabled: true,
  }]),
  SIGN_IN_EMAIL: { send: (message: Mail) => Promise.resolve(void mail.push(message)) },
  EMAIL_FROM: "sign-in@alpha.test", EMAIL_CODE_SECRET: "local-".repeat(8),
  AI: { run: model }, CHAT_MODEL: "alpha-chat", EMBEDDING_MODEL: "alpha-embed",
  CHAT_INPUT_MICROS_PER_1K: "1000", CHAT_OUTPUT_MICROS_PER_1K: "2000", EMBEDDING_INPUT_MICROS_PER_1K: "100", MAX_COMPLETION_TOKENS: "1024",
  STRIPE_SECRET_KEY: "", STRIPE_WEBHOOK_SECRET: "", STRIPE_PRICE_ID: "", STRIPE_PRODUCT_ID: "", STRIPE_PLAN: "plus_monthly",
} as unknown as Worker.CloudBindings;
const worker = cloudWorker();

function asRequest(incoming: IncomingMessage, outgoing: ServerResponse, origin: string) {
  const gone = new AbortController();
  outgoing.on("close", () => gone.abort());
  const body = incoming.method === "GET" || incoming.method === "HEAD" ? undefined : (Readable.toWeb(incoming) as ReadableStream<Uint8Array>);
  const headers = Object.entries(incoming.headers).flatMap(([name, value]) => (Array.isArray(value) ? value : [value ?? ""]).map((one): [string, string] => [name, one]));
  return new Request(new URL(incoming.url ?? "/", origin), { method: incoming.method, headers, body, signal: gone.signal, duplex: "half" } as RequestInit);
}

function answered(response: Response, outgoing: ServerResponse) {
  const cookies = response.headers.getSetCookie();
  outgoing.writeHead(response.status, { ...Object.fromEntries(response.headers), ...(cookies.length ? { "set-cookie": cookies } : {}) }).flushHeaders();
  if (!response.body) return void outgoing.end();
  const sent = Readable.fromWeb(response.body as NodeStream<Uint8Array>);
  outgoing.on("close", () => sent.destroy());
  sent.on("error", () => outgoing.destroy()).pipe(outgoing);
}

async function served(incoming: IncomingMessage, outgoing: ServerResponse) {
  answered(await worker.fetch(asRequest(incoming, outgoing, api), env), outgoing);
}

/** What the operator, the mailbox and the model's provider do in production, for the local cloud only. */
async function operated(incoming: IncomingMessage, outgoing: ServerResponse) {
  const request = asRequest(incoming, outgoing, api);
  const url = new URL(request.url);
  const body = request.method === "POST" ? await request.json() as Record<string, unknown> : {};
  const reply = (data: unknown) => answered(Response.json(data), outgoing);
  if (url.pathname === "/operator/mail") return reply(mail);
  if (url.pathname === "/operator/model") return reply({ scripted: listed(replies, String(body.system)).push(body.reply as Reply) });
  if (url.pathname === "/operator/asked") return reply(listed(asked, url.searchParams.get("system") ?? ""));
  if (url.pathname === "/operator/credits") return reply(await Effect.runPromise(Effect.provide(addCredits({ organizationId: String(body.organizationId), amount: Number(body.amount), requestKey: String(body.requestKey) }), store)));
  if (url.pathname === "/operator/ledger") {
    const organization = url.searchParams.get("organizationId");
    const balance = await database.query("SELECT credit_balance FROM organizations WHERE id = $1", [organization]);
    const charges = await database.query("SELECT charged, outcome FROM usage_records WHERE organization_id = $1 ORDER BY settled_at", [organization]);
    return reply({ balance: Number(balance.rows[0]?.credit_balance ?? 0), charges: charges.rows.map((row) => ({ charged: Number(row.charged), outcome: String(row.outcome) })) });
  }
  answered(Response.json({ error: "route_not_found" }, { status: 404 }), outgoing);
}

process.stdout.write(`${JSON.stringify(address)}\n`);
function stop() {
  secure.close();
  plain.close();
  void socket.stop().then(() => database.close()).finally(() => process.exit(0));
}
for (const signal of ["SIGTERM", "SIGINT"] as const) process.once(signal, stop);
// The starter holds this process's input open: when it ends, however the starter died, so does the cloud.
process.stdin.once("end", stop).resume();
