import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { SettingsAppearancePickerProps } from "./SettingsAppearancePicker.tsx";

const onChoose = fn();

export const meta: ComponentMeta<SettingsAppearancePickerProps> = {
  args: { theme: "system", onChoose },
  examples: { Keeping: { theme: "dark", keeping: true } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onChoose.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("radio", { name: "Dark" }));
      await expect([onChoose.mock.calls, canvas.getByRole("radio", { name: "System" }).getAttribute("aria-checked")]).toEqual([[["dark"]], "true"]);
    },
    Keeping: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onChoose.mockClear();
      await userEvent.click(within(canvasElement).getByRole("radio", { name: "Light" }), { pointerEventsCheck: 0 });
      await expect(onChoose.mock.calls.length).toBe(0);
    },
  },
};
