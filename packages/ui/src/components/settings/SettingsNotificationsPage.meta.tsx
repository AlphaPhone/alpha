import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { fullHeight, reported } from "./samples.ts";
import type { SettingsNotificationsPageProps } from "./SettingsNotificationsPage.tsx";

const onAndroid = fn();
const onHandOver = fn();

export const meta: ComponentMeta<SettingsNotificationsPageProps> = {
  args: {
    alerts: reported("On", "ok"),
    channels: [{ id: "messages", name: "Messages", blocked: false }, { id: "reminders", name: "Reminders", blocked: false }, { id: "agent", name: "Agent updates", blocked: false }],
    onBack: fn(),
    onAndroid,
    onHandOver,
  },
  decorator: fullHeight,
  examples: { "Some off": { alerts: reported("Some off", "warn") }, "No channels": { channels: [] }, "Channel starting": { starting: { target: "alert-channel", channel: "reminders" } } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onAndroid.mockClear();
      onHandOver.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: /Reminders/ }));
      await userEvent.click(canvas.getByRole("button", { name: /Other apps/ }));
      await expect([onAndroid.mock.calls, onHandOver.mock.calls]).toEqual([[[{ target: "alert-channel", channel: "reminders" }]], [["notification-collection"]]]);
    },
    "Channel starting": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getAllByRole("status", { name: "Opening" }).length).toBe(1),
  },
};
