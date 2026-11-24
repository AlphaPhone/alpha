import { area } from "../runtime/area.tsx";
import { Photos } from "./Photos.tsx";
import { back, photos } from "./photos.vibe";

/** Photos, at its view (areas.ts): the phone's photo library, its albums and the Viewer, held in memory while Alpha runs. */
export default area(photos, Photos, { back });
