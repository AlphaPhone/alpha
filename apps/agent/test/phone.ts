import { type ChildProcess, spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import type { RuntimeJsonBridge, RuntimeStatus, RuntimeStreamFrame } from "@elizaos/agent/client";
import { type Cloud, type DeviceKey, said, scratch, startCloud } from "@repo/eliza-harness/services";

/** The owner every journey of the pack signs in. */
const owner = "owner@alpha.test";

/** The run's one local cloud with one signed-in, funded owner, and a directory of the run for each agent it starts. */
export async function startRun() {
  const state = scratch();
  const cloud = await startCloud(state, [owner], 1_000_000);
  const key = cloud.owners.get(owner)!;
  const place = (name: string) => {
    const directory = path.join(state, name);
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    return directory;
  };
  return { cloud, key, place, stop: async () => { await cloud.stop(); fs.rmSync(state, { recursive: true, force: true }); } };
}

/** The pack `pnpm --filter @repo/agent build` wrote: eliza's bundle and the three files eliza's agent service reads. */
const pack = path.join(import.meta.dirname, "../dist");
const read = (file: string) => JSON.parse(fs.readFileSync(path.join(pack, "host", file), "utf8")) as Record<string, unknown>;

/** A route as the host file lists it. */
export interface Listed {
  readonly method: string;
  readonly path: string;
  readonly stream?: boolean;
}

/** The routes the host file admits for the page. */
export const listed = () => read("host.json").routes as Listed[];

/**
 * The launch document eliza's agent service writes from the pack's host files for a signed-in owner
 * (`spec/os/agentService/config.md`, "The launch carries the active key's account"), against the run's own cloud: its
 * origin and the model it offers stand where a hosted deployment's would. `extra` adds keys the pack never writes.
 */
export async function launchFor(cloud: Cloud, key: DeviceKey, state: string, extra: Record<string, unknown> = {}) {
  const file = path.join(state, "launch.json");
  const host = read("host.json");
  const policy = read("policy.json") as { actions: { allowed: string[] }; plugins: { load: string[] } };
  const { data } = await said<{ data: { id: string }[] }>(`${cloud.local}/api/v1/models`, { headers: { authorization: `Bearer ${key.token}` } });
  const offered = data[0]?.id ?? "";
  const model = { ...(host.model as object), cloudBaseUrl: cloud.api, smallModel: offered, largeModel: offered };
  fs.writeFileSync(file, JSON.stringify({
    schema: 1, character: read("character.json"), policy: { actions: { allowed: policy.actions.allowed }, plugins: policy.plugins }, model,
    account: { userId: key.accountId, organizationId: key.organizationId }, embeddings: host.embeddings, persistMemory: host.persistMemory,
    callerRole: host.callerRole, ...extra,
  }), { mode: 0o600 });
  return file;
}

/** One agent process of the pack, as the phone runs it: the launch token it was given, and how it ended. */
export interface Running {
  readonly token: string;
  readonly socket: string;
  readonly exited: Promise<number | null>;
  stop(): Promise<number | null>;
}

/**
 * Start `agent.mjs serve` exactly as eliza's agent service does: a cleared environment, one launch frame on stdin
 * with a fresh token and the device key as the credential. The only addition is the run certificate of the local
 * cloud, the one origin the agent must trust here (`found-by-alpha` item 3).
 */
export function startPhoneAgent(launch: string, state: string, cloud: Cloud, key: DeviceKey): Running {
  const home = path.join(state, "agent");
  fs.mkdirSync(home, { recursive: true, mode: 0o700 });
  const socket = path.join(state, "agent.sock");
  const token = randomBytes(32).toString("base64url");
  const child: ChildProcess = spawn(process.execPath, [path.join(pack, "bundle/agent.mjs"), "serve", "--launch", launch, "--state", home, "--socket", socket], {
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: home, NODE_EXTRA_CA_CERTS: cloud.caFile },
    stdio: ["pipe", "ignore", "ignore"],
  });
  const exited = new Promise<number | null>((done) => child.once("close", (code) => done(code)));
  child.stdin?.end(`${JSON.stringify({ version: 1, token, epoch: Date.now(), credential: { version: 1, value: key.token } })}\n`);
  return { token, socket, exited, stop: () => { child.kill("SIGTERM"); return exited; } };
}

/** One exchange over the agent's socket: one JSON frame each way per connection, a stream as frames until it completes. */
function exchange(socket: string, frame: object, onLine: (line: Record<string, unknown>) => boolean): Promise<void> {
  return new Promise((done, fail) => {
    const connection = net.createConnection(socket);
    let pending = "";
    connection.setEncoding("utf8");
    connection.on("connect", () => connection.write(`${JSON.stringify(frame)}\n`));
    connection.on("data", (text: string) => {
      pending += text;
      for (let end = pending.indexOf("\n"); end >= 0; end = pending.indexOf("\n")) {
        const line = JSON.parse(pending.slice(0, end)) as Record<string, unknown>;
        pending = pending.slice(end + 1);
        if (onLine(line)) { connection.end(); return done(); }
      }
    });
    connection.on("error", fail);
    connection.on("close", () => fail(new Error("the agent closed the socket before it answered")));
  });
}

const payload = (running: Running, method: string, route: string, body: unknown) => ({
  path: route, method, headers: { authorization: `Bearer ${running.token}`, "content-type": "application/json" },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

/** The status and body text of one buffered call, as the phone's plugin relays it. */
export async function call(running: Running, method: string, route: string, body?: unknown) {
  let answer = { status: 0, body: "" };
  await exchange(running.socket, { id: randomUUID(), method: "http_request", payload: payload(running, method, route, body) }, (line) => {
    const result = line.result as { status: number; body: string } | undefined;
    answer = result === undefined ? { status: 0, body: String(line.error) } : { status: result.status, body: result.body };
    return true;
  });
  return answer;
}

/** The frames of one streamed call, as eliza's client reads them from a bridge. */
async function* streamed(running: Running, route: string, body: unknown): AsyncIterable<RuntimeStreamFrame> {
  const frames: RuntimeStreamFrame[] = [];
  await exchange(running.socket, { id: randomUUID(), method: "http_request_stream", payload: payload(running, "POST", route, body) }, (line) => {
    if (line.stream === "response") frames.push({ kind: "head", status: line.status as number, headers: line.headers as Record<string, string> });
    else if (line.stream === "chunk") frames.push({ kind: "chunk", data: Buffer.from(line.dataBase64 as string, "base64") });
    else frames.push({ kind: line.error === undefined && line.stream === "complete" ? "end" : "error" });
    return line.stream !== "response" && line.stream !== "chunk";
  });
  yield* frames;
}

/** eliza's bridge to the agent over its socket, as the phone's `ElizaAgent` plugin is one: it adds this launch's token to each call. */
export function socketBridge(running: Running): RuntimeJsonBridge {
  const status = async (): Promise<RuntimeStatus> => {
    const health = await call(running, "GET", "/api/health").catch(() => ({ status: 0, body: "" }));
    return { available: true, state: health.status === 200 ? "running" : "starting" };
  };
  return {
    status, start: status, restart: status,
    request: async (input) => {
      const answer = await call(running, input.method, input.path, input.body);
      return { status: answer.status, data: answer.body === "" ? null : JSON.parse(answer.body) as unknown };
    },
    requestStream: (input) => streamed(running, input.path, input.body),
  };
}

/** Until the agent's health says ready, within `within` milliseconds, or why it never will. */
export async function ready(running: Running, within = 120_000) {
  const deadline = Date.now() + within;
  let ended: number | null | undefined;
  void running.exited.then((code) => { ended = code; });
  for (;;) {
    if (ended !== undefined) throw new Error(`the agent exited with ${ended} before it was ready`);
    if ((await call(running, "GET", "/api/health").catch(() => ({ status: 0 }))).status === 200) return;
    if (Date.now() > deadline) throw new Error("the agent was not ready in time");
    await new Promise((done) => setTimeout(done, 100));
  }
}
