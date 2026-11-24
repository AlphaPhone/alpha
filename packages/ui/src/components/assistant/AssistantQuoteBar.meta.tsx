import { fn } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantQuoteBarProps } from "./AssistantQuoteBar.tsx";
import { presses } from "./plays.ts";

const onRemove = fn();

export const meta: ComponentMeta<AssistantQuoteBarProps> = {
  args: { kind: "quote", text: "Friday works. Lunch with Ana is at 12:30, at Cais do Sodré.", onRemove },
  examples: { Editing: { kind: "editing", text: undefined, onRemove: undefined } },
  play: {
    Default: presses("Remove quote", onRemove),
  },
};
