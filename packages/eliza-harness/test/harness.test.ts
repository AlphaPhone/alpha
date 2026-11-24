import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { checkout, prepared } from "../src/checkout.ts";
import { bunIn } from "../src/no-bun.vibe";
import { pinnedCheckout } from "../src/pinned.vibe";
import { type Cloud, type RealModel, said, scratch, startCloud } from "../src/services.ts";

const repository = path.join(import.meta.dirname, "../../..");

const owner = "owner@alpha.test";
const strictTool = { type: "function", function: { name: "CALCULATE", parameters: { type: "object", properties: { expression: { type: "string" } }, required: ["expression"], additionalProperties: false }, strict: true } };
const looseTool = { type: "function", function: { name: "RESTORE_CONTEXT", parameters: { type: "object", properties: {} } } };
const called = { id: "call_1", type: "function", function: { name: "CALCULATE", arguments: "{\"expression\":\"17 * 24\"}" } };
const usage = { prompt_tokens: 40, completion_tokens: 8, total_tokens: 48 };

/** Ask `cloud`'s chat route as its owner's agent does, with `tools`: its status and the whole of its answer, a stream's frames included. */
function chat(cloud: Cloud, tools: readonly object[], stream: boolean) {
  const body = JSON.stringify({ model: cloud.model, messages: [{ role: "system", content: "You are Alpha." }, { role: "user", content: "what's 17 times 24" }], tools, max_tokens: 64, stream });
  return new Promise<{ status: number; text: string }>((done, fail) => {
    const headers = { "content-type": "application/json", authorization: `Bearer ${cloud.owners.get(owner)!.token}` };
    http.request(`${cloud.local}/api/v1/chat/completions`, { method: "POST", headers }, (answer) => {
      let text = "";
      answer.setEncoding("utf8").on("data", (part: string) => { text += part; }).on("end", () => done({ status: answer.statusCode ?? 0, text }));
    }).on("error", fail).end(body);
  });
}

/** A cloud of one funded owner over `real`, or the scripted model, given to `use` and stopped after it. */
async function withCloud<A>(real: RealModel | undefined, use: (cloud: Cloud, state: string) => Promise<A>) {
  const state = scratch();
  const cloud = await startCloud(state, [owner], 1_000_000, real);
  try {
    return await use(cloud, state);
  } finally {
    await cloud.stop();
    fs.rmSync(state, { recursive: true, force: true });
  }
}

/** A model provider in place of Cerebras: what each call it was sent carried, and a tool call for an answer, streamed where asked. */
async function startUpstream() {
  const heard: { authorization?: string; body: { model: string; stream?: boolean; tools?: { function: { strict?: boolean } }[] } }[] = [];
  const server = http.createServer((incoming, outgoing) => {
    let text = "";
    incoming.setEncoding("utf8").on("data", (part: string) => { text += part; }).on("end", () => {
      const body = JSON.parse(text) as (typeof heard)[number]["body"];
      heard.push({ authorization: incoming.headers.authorization, body });
      const named = { id: "chatcmpl-upstream", created: 1_790_000_000, model: body.model };
      if (body.stream !== true) {
        return void outgoing.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ...named, object: "chat.completion", choices: [{ index: 0, message: { role: "assistant", content: null, tool_calls: [called] }, finish_reason: "tool_calls" }], usage }));
      }
      const frame = (data: unknown) => `data: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`;
      const piece = (delta: object, finish: string | null) => frame({ ...named, object: "chat.completion.chunk", choices: [{ index: 0, delta, finish_reason: finish }] });
      outgoing.writeHead(200, { "content-type": "text/event-stream" });
      outgoing.end([piece({ role: "assistant", tool_calls: [{ index: 0, ...called }] }, null), piece({}, "tool_calls"), frame({ ...named, object: "chat.completion.chunk", choices: [], usage }), frame("[DONE]")].join(""));
    });
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  return { baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`, heard, stop: () => new Promise<void>((done) => server.close(() => done())) };
}

/** Every file under `directory` whose bytes hold `secret`. */
const holding = (directory: string, secret: string) => (fs.readdirSync(directory, { recursive: true, encoding: "utf8" }))
  .filter((file) => fs.statSync(path.join(directory, file)).isFile() && fs.readFileSync(path.join(directory, file)).includes(secret));

describe("the eliza harness", () => {
  it("finds the pinned checkout built and linked as .eliza", async () => {
    const lock = JSON.parse(fs.readFileSync(path.join(repository, "eliza.lock.json"), "utf8")) as { commit: string };
    const at = prepared();
    expect(at.commit).toBe(lock.commit);
    expect(fs.realpathSync(path.join(repository, ".eliza"))).toBe(fs.realpathSync(at.root));
    expect(await Effect.runPromise(pinnedCheckout())).toEqual({ commit: lock.commit, dir: checkout().root });
  });

  it("starts eliza's cloud on a free loopback port, which answers until it is stopped", async () => {
    const state = scratch();
    try {
      const cloud = await startCloud(state, [], 0);
      const health = `${cloud.local}/api/public/service`;
      expect(new URL(cloud.local).hostname).toBe("127.0.0.1");
      await expect(said(health)).resolves.toBeDefined();
      await cloud.stop();
      await expect(said(health)).rejects.toThrow();
    } finally {
      fs.rmSync(state, { recursive: true, force: true });
    }
  }, 300_000);

  it("answers its owner with the scripted model, which repeats them, where no real model is given", async () => {
    const answer = await withCloud(undefined, (cloud) => chat(cloud, [strictTool, looseTool], false));
    expect(answer.status).toBe(200);
    expect(JSON.parse(answer.text)).toMatchObject({ model: "alpha-chat", choices: [{ message: { role: "assistant", content: "You said: what's 17 times 24" }, finish_reason: "stop" }] });
  }, 300_000);

  it("forwards its owner's calls to a real model under that model's key, with a uniform tool list, and answers with what the model said, streamed or not", async () => {
    const upstream = await startUpstream();
    const key = `test-upstream-${randomBytes(12).toString("hex")}`;
    try {
      const { answers, leaked } = await withCloud({ baseUrl: upstream.baseUrl, model: "qwen-3.8-27b", key }, async (cloud, state) => {
        const answers = [await chat(cloud, [strictTool, looseTool], false), await chat(cloud, [strictTool, looseTool], true), await chat(cloud, [strictTool, strictTool], false)];
        return { answers, leaked: holding(state, key) };
      });
      expect(upstream.heard.map(({ authorization, body }) => ({ authorization, model: body.model, stream: body.stream === true, strict: body.tools?.map((tool) => tool.function.strict) }))).toEqual([
        { authorization: `Bearer ${key}`, model: "qwen-3.8-27b", stream: false, strict: [undefined, undefined] },
        { authorization: `Bearer ${key}`, model: "qwen-3.8-27b", stream: true, strict: [undefined, undefined] },
        { authorization: `Bearer ${key}`, model: "qwen-3.8-27b", stream: false, strict: [true, true] },
      ]);
      expect(answers.map(({ status }) => status)).toEqual([200, 200, 200]);
      expect(JSON.parse(answers[0].text)).toMatchObject({ model: "qwen-3.8-27b", choices: [{ message: { tool_calls: [called] }, finish_reason: "tool_calls" }] });
      expect(answers[1].text).toContain(`"arguments":${JSON.stringify(called.function.arguments)}`);
      expect(JSON.stringify(answers)).not.toContain(key);
      expect(leaked).toEqual([]);
    } finally {
      await upstream.stop();
    }
  }, 300_000);

  it("names each Bun lock, command, import, action and shebang outside legacy/", async () => {
    const tree = scratch();
    try {
      fs.cpSync(path.join(import.meta.dirname, "fixtures/bun"), tree, { recursive: true });
      for (const file of ["bun.lock", "apps/agent/bun.lockb", "bunfig.toml", "legacy/bun.lock"]) {
        fs.mkdirSync(path.dirname(path.join(tree, file)), { recursive: true });
        fs.writeFileSync(path.join(tree, file), "");
      }
      execFileSync("git", ["init", "-q"], { cwd: tree });
      execFileSync("git", ["add", "-A"], { cwd: tree });
      const found = await Effect.runPromise(Effect.provide(bunIn(tree), NodeServices.layer));
      expect(found.map((line) => line.slice(0, line.indexOf(":"))).sort()).toEqual([
        ".github/workflows/ci.yml",
        "apps/agent/bun.lockb",
        "bun.lock",
        "bunfig.toml",
        "scripts/build.sh",
        "scripts/hello.ts",
        "scripts/setup.sh",
        "scripts/store.ts",
      ]);
    } finally {
      fs.rmSync(tree, { recursive: true, force: true });
    }
  });
});
