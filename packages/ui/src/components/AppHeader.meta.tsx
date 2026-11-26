import { ChevronLeft, Plus } from "lucide-react";
import { expect, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AppHeaderProps } from "./AppHeader.tsx";
import { Button } from "./Button.tsx";

export const meta: ComponentMeta<AppHeaderProps> = {
  args: { title: "Notes" },
  examples: {
    Leading: { leading: <Button variant="ghost" size="icon" aria-label="Back"><ChevronLeft /></Button> },
    Actions: { children: <Button variant="ghost" size="icon" aria-label="New note"><Plus /></Button> },
  },
  play: {
    // The launcher's serif title is drawn at Denton's largest optical size, as v119's `.serif`; off the launcher it is not.
    Leading: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const title = within(canvasElement).getByRole("heading", { name: "Notes" });
      await expect(title).toHaveClass("in-data-[alpha-launcher]:[font-variation-settings:'opsz'_144]");
      await expect(title).not.toHaveClass("[font-variation-settings:'opsz'_144]");
    },
  },
};
