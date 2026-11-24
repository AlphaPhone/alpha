import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { SettingsTextSizePickerProps } from "./SettingsTextSizePicker.tsx";

const onChoose = fn();

export const meta: ComponentMeta<SettingsTextSizePickerProps> = {
  args: { size: 100, onChoose },
  examples: { Unavailable: { size: 0 }, Largest: { size: 150 }, Applying: { size: 100, busy: true } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onChoose.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "130 percent" }));
      await expect([onChoose.mock.calls, canvas.getByRole("button", { name: "100 percent" }).getAttribute("aria-pressed")]).toEqual([[[130]], "true"]);
    },
    Unavailable: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryAllByRole("button", { pressed: true })).toEqual([]),
    Applying: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onChoose.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "150 percent" }), { pointerEventsCheck: 0 });
      await expect(onChoose.mock.calls.length).toBe(0);
    },
  },
};
