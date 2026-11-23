import { Plus } from "lucide-react";
import { expect, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { ButtonProps } from "./Button.tsx";

export const meta: ComponentMeta<ButtonProps> = {
  examples: {
    "size icon": { size: "icon", "aria-label": "Add", children: <Plus /> },
    Empty: { size: "icon", "aria-label": "Add", children: undefined },
  },
  play: {
    Loading: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const button = within(canvasElement).getByRole("button");
      button.focus();
      await userEvent.keyboard("{Enter}");
      await expect([button.getAttribute("aria-busy"), button.getAttribute("aria-disabled"), document.activeElement]).toEqual(["true", "true", button]);
    },
  },
};
