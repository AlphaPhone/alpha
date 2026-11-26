// spec/app/calendar/agent.md, "The card shows in Ask Alpha too, under the reply that filed its request, typed or spoken"
import type { Area } from "../runtime/area.tsx";
import { Proposal } from "./Calendar.tsx";
import calendar from "./index.tsx";

/** The agent's Calendar card in Ask Alpha (areas.ts), over Calendar's own machines, so a decision there is Calendar's. */
export default {
  open(alpha) {
    const runtime = calendar.runtime(alpha);
    return function AskedCalendarChange() {
      return <Proposal runtime={runtime} className="m-0" />;
    };
  },
} satisfies Area;
