import type { ComponentMeta } from "vibestack/stories";
import type { AssistantContextChipProps } from "./AssistantContextChip.tsx";

export const meta: ComponentMeta<AssistantContextChipProps> = {
  args: { view: "Calendar", day: "Thu 10 Jul" },
  examples: { Home: { view: "Home", day: undefined }, Selected: { selected: true }, Sensitive: { view: "Passwords", day: undefined, sensitive: true } },
};
