import { fn } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { HomeCardsProps } from "./HomeCards.tsx";

export const meta: ComponentMeta<HomeCardsProps> = {
  args: { open: fn() },
};
