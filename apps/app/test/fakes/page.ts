import { developedRecording } from "./notes.ts";
import { plugIn } from "./phone.ts";
import { plugins } from "./plugins.ts";
import { servedUnder } from "./routes.ts";
import { scene } from "./scene.ts";
import { developTelephony } from "./telephony.ts";

const base = scene();
const now = Date.now();
base.files.drawsPages = true;
base.files.now = now;
base.files.stored.forEach((one, at) => { one.modified = now - at * 26 * 3_600_000; });
base.photos.access = { scope: "full", images: "full", videos: "full" };
base.notes.audio.set(developedRecording.audioId, { noteId: developedRecording.noteId, durationMs: developedRecording.durationMs });
const world = { ...base, phone: true, image: true, telephony: developTelephony(now) };
Object.defineProperty(world, "now", { get: () => Date.now(), set: () => {}, enumerable: true, configurable: true });
plugIn(plugins(world, { agent: servedUnder("/agent"), cloud: servedUnder("/cloud") }));
