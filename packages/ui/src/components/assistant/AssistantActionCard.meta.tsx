import { fn } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantActionCardProps } from "./AssistantActionCard.tsx";
import { offersNothing, presses, refuses } from "./plays.ts";

const onAct = fn();

export const meta: ComponentMeta<AssistantActionCardProps> = {
  args: { action: "signIn", title: "Sign in to continue", detail: "Alpha needs your account to book the table.", onAct },
  examples: {
    Plan: { action: "plan", title: "Plan for Friday", detail: undefined, steps: ["Find a table near Cais", "Message Ana", "Add it to the calendar"] },
    Retry: { action: "retry", title: "That did not go through", detail: undefined },
    "Retry not taken": { action: "retry", title: "That did not go through", detail: undefined, notTaken: true },
    Funding: { action: "funding", title: "Add funds to keep going", detail: "Your balance is used up." },
  },
  play: {
    Default: presses("Sign in", onAct),
    Waiting: refuses("Sign in", onAct),
    Settled: offersNothing,
  },
};
