import { expect, fn, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { locateCard, routeCard } from "./fixtures.ts";
import type { MapsCardProps } from "./MapsCard.tsx";

export const meta: ComponentMeta<MapsCardProps> = {
  args: { card: routeCard, live: true, onOpenMap: fn() },
  examples: { Locate: { card: locateCard }, Stale: { live: false } },
  play: {
    Stale: async ({ canvasElement }) => {
      await expect(within(canvasElement).getByRole("button", { name: /Map/ })).toBeDisabled();
    },
  },
};
