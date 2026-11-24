import { Layer } from "effect";
import { area } from "../runtime/area.tsx";
import { CallStrip } from "./CallStrip.tsx";

/** The call strip, over every view: its machine is resident. */
export default area(Layer.empty, CallStrip);
