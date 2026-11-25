// spec/app/workflows/clock.md, "Story: Describe an alarm for Clock"
import { area } from "../runtime/area.tsx";
import { back, clock } from "./clock.vibe";
import { Clock } from "./Clock.tsx";

/** The Clock page, in Workflows (areas.ts): its machine lives from its first opening until Alpha closes. */
export default area(clock, Clock, { back });
