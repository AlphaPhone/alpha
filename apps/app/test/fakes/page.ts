import { plugIn } from "./phone.ts";
import { plugins } from "./plugins.ts";
import { servedUnder } from "./routes.ts";
import { scene } from "./scene.ts";
import { developTelephony } from "./telephony.ts";

const world = { ...scene(), phone: true, image: true, telephony: developTelephony(Date.now()) };
Object.defineProperty(world, "now", { get: () => Date.now(), set: () => {}, enumerable: true, configurable: true });
plugIn(plugins(world, { agent: servedUnder("/agent"), cloud: servedUnder("/cloud") }));
