import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { fullHeight } from "./samples.ts";
import type { SettingsPermissionsPageProps } from "./SettingsPermissionsPage.tsx";

const onReview = fn();
const onNotifications = fn();

export const meta: ComponentMeta<SettingsPermissionsPageProps> = {
  args: {
    grants: { camera: "allowed", microphone: "off", location: "approximate", calendar: "allowed", photos: "unavailable", files: "off", notifications: "allowed" },
    onBack: fn(),
    onReview,
    onAndroid: fn(),
  },
  decorator: fullHeight,
  examples: {
    Browser: { browser: {
      camera: { word: "reported", value: "Ask", status: "warn" },
      microphone: { word: "reported", value: "Off", status: "off" },
      location: { word: "unavailable", compact: true },
      photos: { word: "reported", value: "Selected", status: "warn" },
      files: { word: "reported", value: "Chosen files", status: "warn" },
      notifications: { word: "reported", value: "Allowed", status: "ok" },
    }, onNotifications },
    Waiting: { grants: { camera: "waiting", microphone: "waiting", location: "waiting", calendar: "waiting", photos: "waiting", files: "waiting", notifications: "waiting" } },
  },
  play: {
    Browser: async ({ canvasElement }) => {
      onReview.mockClear();
      onNotifications.mockClear();
      const canvas = within(canvasElement);
      expect(canvas.getByText("Ask")).toBeTruthy();
      expect(canvas.getByText("Chosen files")).toBeTruthy();
      expect(canvas.queryByText("Calendar")).toBeNull();
      expect(canvas.queryByRole("button", { name: /Camera|Alpha’s permissions|Access to all files/ })).toBeNull();
      await userEvent.click(canvas.getByRole("button", { name: /Notifications.*Allowed/ }));
      await expect(onNotifications.mock.calls.length).toBe(1);
      await expect(onReview.mock.calls.length).toBe(0);
    },
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onReview.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Microphone/ }));
      await expect(onReview.mock.calls).toEqual([["microphone"]]);
    },
  },
};
