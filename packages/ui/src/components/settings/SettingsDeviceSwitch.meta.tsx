import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { inGroup } from "./samples.ts";
import type { SettingsDeviceSwitchProps } from "./SettingsDeviceSwitch.tsx";

const onChange = fn();
const onRecover = fn();

export const meta: ComponentMeta<SettingsDeviceSwitchProps> = {
  args: { setting: "ask-first", read: "loaded", checked: true, onChange },
  decorator: inGroup,
  examples: {
    Images: { setting: "images", checked: false },
    Unreadable: { read: "failed", onRecover },
    Recovering: { read: "failed", recovering: true },
  },
  play: {
    Images: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onChange.mockClear();
      await userEvent.click(within(canvasElement).getByRole("switch", { name: /Load images/ }));
      await expect(onChange.mock.calls).toEqual([[true]]);
    },
    Unreadable: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onChange.mockClear();
      onRecover.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("switch"), { pointerEventsCheck: 0 });
      await userEvent.click(canvas.getByRole("button", { name: "Recover device settings" }));
      await expect([onChange.mock.calls.length, onRecover.mock.calls.length]).toEqual([0, 1]);
    },
    Recovering: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await expect(canvas.getByRole("status", { name: "Recovering" })).toBeTruthy();
      await expect(canvas.queryByRole("button", { name: "Recover device settings" })).toBeNull();
    },
  },
};
