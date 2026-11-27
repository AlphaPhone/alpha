// spec/app/calendar/agent.md, "The card shows in Ask Alpha too, under the reply that filed its request, typed or spoken"
import { use } from "react";
import type { Area } from "../runtime/ui.tsx";
import { AskedRequest } from "./asked.ts";
import { Proposal } from "./Calendar.tsx";
import calendar from "./index.tsx";

/** The agent's Calendar card in Ask Alpha (areas.ts), over Calendar's own machines, so a decision there is Calendar's, bound to the request its reply filed. */
export default {
  open(alpha) {
    const runtime = calendar.runtime(alpha);
    return function AskedCalendarChange() {
      const request = use(AskedRequest);
      return request === undefined ? null : <Proposal runtime={runtime} className="m-0" request={request} />;
    };
  },
} satisfies Area;
