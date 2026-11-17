import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { SliderProps } from "./Slider.tsx";

const onValueChange = fn();

export const meta: ComponentMeta<SliderProps> = {
  args: { "aria-label": "Volume", defaultValue: 40, onValueChange },
  bounds: { defaultValue: [0, 100] },
  examples: { "Value text": { "aria-label": "Text size", min: 1, max: 3, defaultValue: 2, "aria-valuetext": "Medium" } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onValueChange.mockClear();
      const thumb = within(canvasElement).getByRole("slider", { name: "Volume" });
      thumb.focus();
      await userEvent.keyboard("{ArrowRight}{End}");
      await expect([thumb.getAttribute("aria-valuenow"), onValueChange.mock.calls]).toEqual(["100", [[41], [100]]]);
    },
    "Value text": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("slider", { name: "Text size" }).getAttribute("aria-valuetext")).toBe("Medium"),
  },
};
