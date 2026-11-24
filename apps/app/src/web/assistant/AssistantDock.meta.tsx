import { fn } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantDockProps } from "./AssistantDock.tsx";

export const meta: ComponentMeta<AssistantDockProps> = {
  args: { open: fn() },
};
