import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { fullHeight } from "./samples.ts";
import type { SettingsDisplayPageProps } from "./SettingsDisplayPage.tsx";

const onChooseTheme = fn();
const onChooseSize = fn();

export const meta: ComponentMeta<SettingsDisplayPageProps> = {
  args: { theme: "system", size: 100, onBack: fn(), onChooseTheme, onChooseSize, onAndroid: fn() },
  decorator: fullHeight,
  examples: {
    Keeping: { theme: "dark", keeping: true },
    "Not saved": { notice: "not-saved" },
    "Size not confirmed": { notice: "size-not-confirmed", sizing: true },
    "No text size": { size: 0, notice: "size-unavailable" },
    Largest: { size: 150 },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onChooseTheme.mockClear();
      onChooseSize.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("radio", { name: "Dark" }));
      await userEvent.click(canvas.getByRole("button", { name: "130 percent" }));
      await expect([onChooseTheme.mock.calls, onChooseSize.mock.calls]).toEqual([[["dark"]], [[130]]]);
    },
    Keeping: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onChooseTheme.mockClear();
      await userEvent.click(within(canvasElement).getByRole("radio", { name: "Light" }), { pointerEventsCheck: 0 });
      await expect(onChooseTheme.mock.calls.length).toBe(0);
    },
  },
};
