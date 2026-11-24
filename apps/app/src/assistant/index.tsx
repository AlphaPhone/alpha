import { area } from "../runtime/area.tsx";
import { Assistant } from "./Assistant.tsx";
import { assisting } from "./assistant.vibe";

/** Ask Alpha in full, over Home and every app (areas.ts): its machines live from the screen's first load. */
export default area(assisting, Assistant);
