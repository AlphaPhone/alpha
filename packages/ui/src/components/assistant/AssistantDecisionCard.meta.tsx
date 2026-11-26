import { fn } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantDecisionCardProps } from "./AssistantDecisionCard.tsx";
import { offersNothing, presses, refuses } from "./plays.ts";

const onHandOn = fn();
const onDecline = fn();

export const meta: ComponentMeta<AssistantDecisionCardProps> = {
  args: { variant: "proposal", title: "Move the dentist to Tuesday", detail: "Tuesday 8 July, 16:00, Rua Augusta", action: "Approve", onHandOn },
  examples: { Waiting: { waiting: true }, Review: { variant: "review", title: "Stand-up moves to 10:00", action: "Review change" }, Declinable: { onDecline }, DeclineDisabled: { onDecline, declineDisabled: true } },
  play: {
    Default: presses("Approve", onHandOn),
    Declinable: presses("Decline", onDecline),
    DeclineDisabled: refuses("Decline", onDecline),
    Waiting: refuses("Approve", onHandOn),
    Settled: offersNothing,
  },
};
