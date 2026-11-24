import { Layer } from "effect";
import { area } from "../runtime/area.tsx";
import { CallBar } from "./CallBar.tsx";

/** The ongoing-call bar, over every view: its machine is resident. */
export default area(Layer.empty, CallBar);
