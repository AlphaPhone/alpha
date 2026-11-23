import { area } from "../../src/runtime/area.tsx";
import { Reminders } from "./Reminders.tsx";
import { reminders } from "./sample.vibe";

/** Reminders, the sample area. Only its own journeys mount it, at a view's place; no build ships it. */
export default area(reminders, Reminders);
