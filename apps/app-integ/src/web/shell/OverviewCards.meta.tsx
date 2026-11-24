import type { ComponentMeta } from "vibestack/stories";
import type { OverviewCardsProps } from "./OverviewCards.tsx";
import { busyDay, overdueDay, quietDay } from "./fixtures.ts";

export const meta: ComponentMeta<OverviewCardsProps> = {
  args: { overview: busyDay, onOpen: () => {} },
  examples: { Overdue: { overview: overdueDay }, Quiet: { overview: quietDay } },
};
