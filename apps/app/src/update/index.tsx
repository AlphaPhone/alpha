import { Layer } from "effect";
import { area } from "../runtime/area.tsx";
import { UpdateRows } from "./Rows.tsx";

/** Settings' update rows, at the place Settings offers them: the updates machine is resident. */
export default area(Layer.empty, UpdateRows);
