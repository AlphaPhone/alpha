import { plugIn } from "../fakes/phone.ts";
import { plugins } from "../fakes/plugins.ts";
import type { Answering } from "../fakes/routes.ts";
import { scene } from "../fakes/scene.ts";

/** The dev server's real agent or cloud under `prefix`, asked as a plugin's native code would ask it. */
const served = (prefix: string): Answering => async (request) => {
  const { pathname, search } = new URL(request.url);
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
  return fetch(`${prefix}${pathname}${search}`, { method: request.method, headers: request.headers, body, signal: request.signal });
};

/**
 * The fake phone's plugins over `pnpm dev`'s real agent and cloud, for `test/eliza/notes.ts`: the page runs as on an
 * Alpha image, and the world is on `globalThis.alphaPhone` so the replay can hand Talk the words the phone heard.
 */
const world = { ...scene(), phone: true };
Object.assign(globalThis, { alphaPhone: world });
plugIn(plugins(world, { agent: served("/agent"), cloud: served("/cloud") }));
