import { plugIn } from "./phone.ts";
import { plugins } from "./plugins.ts";
import type { Answering } from "./routes.ts";
import { scene } from "./scene.ts";
import { developTelephony } from "./telephony.ts";

/** The fake service the dev server answers under `prefix`, asked as a plugin's native code would ask the real one. */
const served = (prefix: string): Answering => async (request) => {
  const { pathname, search } = new URL(request.url);
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
  return fetch(`${prefix}${pathname}${search}`, { method: request.method, headers: request.headers, body, signal: request.signal });
};

const world = { ...scene(), phone: true, image: true, telephony: developTelephony(Date.now()) };
Object.defineProperty(world, "now", { get: () => Date.now(), set: () => {}, enumerable: true, configurable: true });
plugIn(plugins(world, { agent: served("/agent"), cloud: served("/cloud") }));
