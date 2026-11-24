import { Layer } from "effect";
import { area } from "../runtime/area.tsx";
import { Review } from "./Review.tsx";

/** The review of what the agent asked of the phone, over every view: its machine is resident. */
export default area(Layer.empty, Review);
