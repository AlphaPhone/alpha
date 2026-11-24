import { area } from "../runtime/area.tsx";
import { Files } from "./Files.tsx";
import { back, files } from "./files.vibe";

/** Files, at its view (areas.ts): the phone's shared storage and its Trash, whose machines are kept across restarts. */
export default area(files, Files, { back });
