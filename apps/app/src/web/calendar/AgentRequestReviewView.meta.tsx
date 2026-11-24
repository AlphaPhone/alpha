import type { ComponentMeta } from "vibestack/stories";
import type { AgentRequestReviewViewProps } from "./AgentRequestReviewView.tsx";
import { busyAnswer, chooseCalendars, chooseManyCalendars, freeAnswer } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<AgentRequestReviewViewProps> = {
  args: { sheet: chooseCalendars, onChooseCalendars: none, onConfirmResult: none },
  examples: {
    ManyCalendars: { sheet: chooseManyCalendars },
    Busy: { sheet: busyAnswer },
    Free: { sheet: freeAnswer },
    NoRequest: { sheet: { kind: "none" } },
  },
};
