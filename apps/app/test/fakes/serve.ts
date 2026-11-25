import { type IncomingMessage, type ServerResponse } from "node:http";
import { Readable } from "node:stream";
import type { ReadableStream as NodeStream } from "node:stream/web";
import type { Plugin } from "vite";
import type { Answering } from "./routes.ts";
import { seedReferenceWeek } from "./calendar.ts";
import { type Scene, scene, services } from "./scene.ts";
import { notices } from "./settings.ts";

async function relay(answer: Answering, incoming: IncomingMessage, outgoing: ServerResponse) {
  const abort = new AbortController();
  incoming.on("close", () => { if (!incoming.complete) abort.abort(); });
  outgoing.on("close", () => { if (!outgoing.writableEnded) abort.abort(); });
  try {
    const body = incoming.method === "GET" || incoming.method === "HEAD" ? undefined : (Readable.toWeb(incoming) as ReadableStream<Uint8Array>);
    const headers = Object.entries(incoming.headers).flatMap(([name, value]) => (Array.isArray(value) ? value : [value ?? ""]).map((one): [string, string] => [name, one]));
    const response = await answer(new Request(new URL(incoming.url ?? "/", "http://fake"), { method: incoming.method, headers, body, signal: abort.signal, duplex: "half" } as RequestInit));
    if (outgoing.destroyed || outgoing.writableEnded) return;
    outgoing.writeHead(response.status, Object.fromEntries(response.headers)).flushHeaders();
    if (!response.body) return void outgoing.end();
    const sent = Readable.fromWeb(response.body as NodeStream<Uint8Array>);
    outgoing.on("close", () => sent.destroy());
    sent.pipe(outgoing);
  } catch {
    if (!outgoing.headersSent && !outgoing.destroyed) outgoing.writeHead(502, { "content-type": "application/json" }).end(JSON.stringify({ error: "fake_relay_failed" }));
  }
}

/**
 * What the dev server shows beyond the journeys' empty world, as develop's browser fixture does: the agent's calendar
 * holds develop's reference week, "Design review" at 3:00 PM today among it, and its clock reads wall time instead of epoch 0.
 */
function developed(world: Scene): Scene {
  Object.defineProperty(world, "now", {
    get: () => Date.now(),
    set: () => {},
    enumerable: true,
    configurable: true,
  });
  seedReferenceWeek(world.calendar, Date.now());
  return world;
}

/**
 * The fake agent, cloud, Slack, and Telegram at the dev server's /agent, /cloud, /slack, and /telegram, from the routes the journeys use, so that `pnpm dev`
 * and the explore stage run with no agent; `apply: "serve"` keeps it out of every build. With `real` the agent is the one at that address.
 * With `phone` the page reaches them through the fake phone's plugins, as on an Alpha image.
 */
export function fakes(real?: string, phone = false): Plugin {
  const { agent, cloud, slack, telegram } = services(developed(scene()));
  return {
    name: "alpha-fakes",
    apply: "serve",
    transformIndexHtml: () => (phone ? [{ tag: "script", attrs: { type: "module", src: "/test/fakes/page.ts" }, injectTo: "head-prepend" }] : []),
    configureServer(server) {
      if (real === undefined) server.middlewares.use("/agent", (incoming, outgoing) => void relay(agent, incoming, outgoing));
      server.middlewares.use("/cloud", (incoming, outgoing) => void relay(cloud, incoming, outgoing));
      server.middlewares.use("/slack", (incoming, outgoing) => void relay(slack, incoming, outgoing));
      server.middlewares.use("/telegram", (incoming, outgoing) => void relay(telegram, incoming, outgoing));
      server.middlewares.use("/licenses/third-party-notices.json", (_incoming, outgoing) => void outgoing.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(notices)));
    },
    config: () => (real === undefined ? {} : { server: { proxy: { "/agent": { target: real, rewrite: (path: string) => path.slice("/agent".length) } } } }),
  };
}
