import { plugIn } from "./phone.ts";
import { plugins } from "./plugins.ts";
import { servedUnder } from "./routes.ts";
import { scene } from "./scene.ts";
import { developTelephony } from "./telephony.ts";

const world = scene();
const now = Date.now();
world.files.drawsPages = true;
world.files.now = now;
world.files.stored.forEach((one, at) => { one.modified = now - at * 26 * 3_600_000; });
plugIn(plugins({ ...world, phone: true, image: true, telephony: developTelephony(now) }, { agent: servedUnder("/agent"), cloud: servedUnder("/cloud") }));
