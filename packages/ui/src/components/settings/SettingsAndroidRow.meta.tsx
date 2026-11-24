import { Bell, Wifi } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { inGroup, reported } from "./samples.ts";
import type { SettingsAndroidRowProps } from "./SettingsAndroidRow.tsx";

const onAndroid = fn();

export const meta: ComponentMeta<SettingsAndroidRowProps> = {
  args: { target: "wifi-networks", title: "Wi-Fi", icon: <Wifi />, reading: reported("Home"), onAndroid },
  decorator: inGroup,
  examples: {
    Starting: { starting: { target: "wifi-networks" } },
    "Another starting": { starting: { target: "bluetooth-devices" } },
    Channel: { target: "alert-channel", channel: 2, title: "Reminders", icon: <Bell />, reading: undefined },
    "Not pressable": { onAndroid: undefined },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onAndroid.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Wi-Fi/ }));
      await expect(onAndroid.mock.calls).toEqual([[{ target: "wifi-networks", channel: undefined }]]);
    },
    Channel: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onAndroid.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Reminders/ }));
      await expect(onAndroid.mock.calls).toEqual([[{ target: "alert-channel", channel: 2 }]]);
    },
    Starting: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onAndroid.mockClear();
      const canvas = within(canvasElement);
      await expect(canvas.getByRole("status", { name: "Opening" })).toBeTruthy();
      await userEvent.click(canvas.getByRole("button", { name: /Wi-Fi/ }), { pointerEventsCheck: 0 });
      await expect(onAndroid.mock.calls.length).toBe(0);
    },
    "Another starting": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onAndroid.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Wi-Fi/ }), { pointerEventsCheck: 0 });
      await expect(onAndroid.mock.calls.length).toBe(0);
    },
    "Not pressable": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button")).toBeNull(),
  },
};
