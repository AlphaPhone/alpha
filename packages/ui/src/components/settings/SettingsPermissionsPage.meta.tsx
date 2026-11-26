import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { fullHeight } from "./samples.ts";
import type { SettingsPermissionsPageProps } from "./SettingsPermissionsPage.tsx";
import type { AndroidStart } from "./vocabulary.ts";

const onAndroid = fn<(start: AndroidStart) => void>();
const onNotifications = fn();

export const meta: ComponentMeta<SettingsPermissionsPageProps> = {
  args: {
    grants: { camera: "allowed", microphone: "off", location: "approximate", calendar: "allowed", photos: "unavailable", files: "off", notifications: "allowed" },
    onBack: fn(),
    onAndroid,
    onNotifications,
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
    Browser: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onAndroid.mockClear();
      onNotifications.mockClear();
      const canvas = within(canvasElement);
      await expect(canvas.getByText("Ask")).toBeTruthy();
      await expect(canvas.getByText("Chosen files")).toBeTruthy();
      await expect(canvas.queryByText("Calendar")).toBeNull();
      await expect(canvas.queryByRole("button", { name: /Camera|Alpha’s permissions|Access to all files/ })).toBeNull();
      await userEvent.click(canvas.getByRole("button", { name: /Notifications.*Allowed/ }));
      await expect(onNotifications.mock.calls.length).toBe(1);
      await expect(onAndroid.mock.calls.length).toBe(0);
    },
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onAndroid.mockClear();
      onNotifications.mockClear();
      const canvas = within(canvasElement);
      for (const name of [/Camera/, /Microphone/, /Location/, /Calendar/, /Photos/, /Files/]) {
        await userEvent.click(canvas.getByRole("button", { name }));
      }
      await userEvent.click(canvas.getByRole("button", { name: /Notifications/ }));
      await expect(onAndroid.mock.calls.map(([choice]) => choice.target))
        .toEqual(["app-permissions", "app-permissions", "app-permissions", "app-permissions", "photo-permissions", "all-files-access"]);
      await expect(onNotifications.mock.calls.length).toBe(1);
    },
  },
};
