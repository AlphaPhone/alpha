import { Star } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { ChipProps } from "./Chip.tsx";

const onClear = fn();

export const meta: ComponentMeta<ChipProps> = {
  args: { children: "Unread", onClear: undefined },
  examples: {
    Empty: { "aria-label": "Starred", children: <Star aria-hidden className="size-4" /> },
    Clearable: { defaultPressed: true, children: "From Ana", onClear },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const chip = within(canvasElement).getByRole("button", { name: "Unread" });
      await userEvent.click(chip);
      await expect(chip.getAttribute("aria-pressed")).toBe("true");
      await userEvent.keyboard(" ");
      await expect(chip.getAttribute("aria-pressed")).toBe("false");
    },
    Clearable: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onClear.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Clear From Ana" }));
      await expect([onClear.mock.calls.length, canvas.getByRole("button", { name: "From Ana" }).getAttribute("aria-pressed")]).toEqual([1, "true"]);
    },
  },
};
