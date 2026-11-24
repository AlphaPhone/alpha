import { fn } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantDecisionCardProps } from "./AssistantDecisionCard.tsx";
import { offersNothing, presses, refuses } from "./plays.ts";

const onHandOn = fn();

export const meta: ComponentMeta<AssistantDecisionCardProps> = {
  args: { variant: "proposal", title: "Move the dentist to Tuesday", detail: "Tuesday 8 July, 16:00, Rua Augusta", action: "Approve", onHandOn },
  examples: { Waiting: { waiting: true }, Review: { variant: "review", title: "Stand-up moves to 10:00", action: "Review change" } },
  play: {
    Default: presses("Approve", onHandOn),
    Waiting: refuses("Approve", onHandOn),
    Settled: offersNothing,
  },
};
