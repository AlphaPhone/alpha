import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { SliderProps } from "./Slider.tsx";

const onValueChange = fn();

export const meta: ComponentMeta<SliderProps> = {
  args: { "aria-label": "Volume", defaultValue: 40, onValueChange },
  bounds: { defaultValue: [0, 100] },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onValueChange.mockClear();
      const thumb = within(canvasElement).getByRole("slider", { name: "Volume" });
      thumb.focus();
      await userEvent.keyboard("{ArrowRight}{End}");
      await expect([thumb.getAttribute("aria-valuenow"), onValueChange.mock.calls]).toEqual(["100", [[41], [100]]]);
    },
  },
};
