import { area } from "../runtime/area.tsx";
import { ClockHomeCard } from "./ClockHomeCard.tsx";
import { ensureClockResident } from "./sync.vibe";

/** Home card showing active timers or the next upcoming alarm: reuses resident Clock machines. */
export default area(ensureClockResident, ClockHomeCard);
