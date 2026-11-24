import { Layer } from "effect";
import { area } from "../runtime/area.tsx";
import { Disclosure } from "./Disclosure.tsx";

/** The voice area's question over every view: its machine is resident. */
export default area(Layer.empty, Disclosure);
