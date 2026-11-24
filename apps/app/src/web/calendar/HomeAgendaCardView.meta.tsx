import type { ComponentMeta } from "vibestack/stories";
import type { HomeAgendaCardViewProps } from "./HomeAgendaCardView.tsx";
import { homeAllDayLong, homeFailed, homeNext, homeNothing, homeQuiet, homeSaved, homeUnverified } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<HomeAgendaCardViewProps> = {
  args: { card: homeNext, zone: "UTC", onTap: none },
  examples: {
    Saved: { card: homeSaved },
    AllDayLongTitle: { card: homeAllDayLong },
    NothingPlanned: { card: homeNothing },
    Unverified: { card: homeUnverified },
    Failed: { card: homeFailed },
    Quiet: { card: homeQuiet },
  },
};
