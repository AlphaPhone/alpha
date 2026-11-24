import { Layer } from "effect";
import { area } from "../runtime/area.tsx";
import { UpdateHolding } from "./Holding.tsx";

/** "Updating Alpha…" over every view: the page machine is resident. */
export default area(Layer.empty, UpdateHolding);
