import { developedRecording } from "./notes.ts";
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
world.photos.access = { scope: "full", images: "full", videos: "full" };
world.notes.audio.set(developedRecording.audioId, { noteId: developedRecording.noteId, durationMs: developedRecording.durationMs });
plugIn(plugins({ ...world, phone: true, image: true, telephony: developTelephony(now) }, { agent: servedUnder("/agent"), cloud: servedUnder("/cloud") }));
