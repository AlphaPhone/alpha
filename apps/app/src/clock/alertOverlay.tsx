import { area } from "../runtime/ui.tsx";
import { ClockAlertOverlay } from "./ClockAlertOverlay.tsx";
import { ensureClockResident } from "./sync.vibe";

/** Ringing alarm and timer overlay mounted at `overlay`: reuses resident Clock machines. */
export default area(ensureClockResident, ClockAlertOverlay);
