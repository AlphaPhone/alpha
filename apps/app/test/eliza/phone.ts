import { plugIn } from "../fakes/phone.ts";
import { plugins } from "../fakes/plugins.ts";
import { servedUnder } from "../fakes/routes.ts";
import { scene } from "../fakes/scene.ts";

/**
 * The fake phone's plugins over `pnpm dev`'s real agent and cloud, for `test/eliza/notes.ts`: the page runs as on an
 * Alpha image, and the world is on `globalThis.alphaPhone` so the replay can hand Talk the words the phone heard.
 */
const world = { ...scene(), phone: true };
Object.assign(globalThis, { alphaPhone: world });
plugIn(plugins(world, { agent: servedUnder("/agent"), cloud: servedUnder("/cloud") }));
