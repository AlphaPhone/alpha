import { area } from "../runtime/area.tsx";
import { Ask } from "./Ask.tsx";
import { asking } from "./ask.vibe";

/** Ask Alpha, over Home and every app (areas.ts). Its conversation lives in memory, so the area brings its machine. */
export default area(asking, Ask);
