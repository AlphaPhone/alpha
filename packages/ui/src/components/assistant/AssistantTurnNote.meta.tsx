import { fn } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantTurnNoteProps } from "./AssistantTurnNote.tsx";
import { presses } from "./plays.ts";

const onCheck = fn();

export const meta: ComponentMeta<AssistantTurnNoteProps> = {
  args: { status: "replying", onCheck: undefined },
  examples: {
    Unknown: { status: "unknown", onCheck },
    "Look later": { status: "lookLater", onCheck },
    "Not sent": { status: "neverArrived" },
    "Cut off": { status: "cutOff" },
  },
  play: {
    Unknown: presses("Check for reply", onCheck),
  },
};
