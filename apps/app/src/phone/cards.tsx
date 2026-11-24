import { Layer } from "effect";
import { area } from "../runtime/area.tsx";
import { HomeCards } from "./HomeCards.tsx";

/** Home's Messages and Phone cards, in Home's row: the machines they read are resident. */
export default area(Layer.empty, HomeCards);
