import { Layer } from "effect";
import { area } from "../runtime/area.tsx";
import { Reminders } from "./Reminders.tsx";

/** Reminders, shown for Notes. Its one machine is kept in a store, so it is resident (resident.ts) and the area adds none. */
export default area(Layer.empty, Reminders);
