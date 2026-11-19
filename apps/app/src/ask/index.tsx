import { area } from "../runtime/area.tsx";
import { Ask } from "./Ask.tsx";
import { asking } from "./ask.vibe";

/** Ask Alpha. Its conversation lives in memory, so the area brings its machine. */
export default area(asking, Ask);
