import { area } from "../../src/runtime/area.tsx";
import { TextSize } from "./TextSize.tsx";
import { size } from "./size.vibe";

/** The text size, the second sample area. Only its own journey mounts it; no build ships it. */
export default area(size, TextSize);
