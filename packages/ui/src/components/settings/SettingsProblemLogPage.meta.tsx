import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { fullHeight } from "./samples.ts";
import type { SettingsProblemLogPageProps } from "./SettingsProblemLogPage.tsx";

const onRetry = fn();
const onClear = fn();
const onRecover = fn();

export const meta: ComponentMeta<SettingsProblemLogPageProps> = {
  args: { log: "some", problems: 3, needs: ["device-preferences", "notification-data"], onBack: fn(), onRetry, onClear, onExport: fn(), onRecover },
  decorator: fullHeight,
  examples: {
    Waiting: { log: "waiting", problems: 0, needs: [] },
    "No problems": { log: "none", problems: 0, needs: [] },
    "One problem": { problems: 1, needs: [] },
    Unavailable: { log: "unavailable" },
    Clearing: { clearing: true },
    Exporting: { exporting: true },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onClear.mockClear();
      onRecover.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Clear" }));
      await userEvent.click(canvas.getByRole("button", { name: "Recover notification data" }));
      await expect([onClear.mock.calls.length, onRecover.mock.calls]).toEqual([1, [["notification-data"]]]);
    },
    Unavailable: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRetry.mockClear();
      const canvas = within(canvasElement);
      await expect(canvas.queryByRole("button", { name: "Clear" })).toBeNull();
      await userEvent.click(canvas.getByRole("button", { name: "Retry" }));
      await expect(onRetry.mock.calls.length).toBe(1);
    },
    Clearing: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onClear.mockClear();
      const canvas = within(canvasElement);
      await expect(canvas.getByRole("status", { name: "Clearing" })).toBeTruthy();
      await expect(canvas.queryByRole("button", { name: "Clear" })).toBeNull();
    },
  },
};
