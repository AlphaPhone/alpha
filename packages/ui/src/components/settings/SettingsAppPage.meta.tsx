import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { fullHeight } from "./samples.ts";
import type { SettingsAppPageProps } from "./SettingsAppPage.tsx";

const onImagesChange = fn();
const onHandOver = fn();
const onAndroid = fn();

export const meta: ComponentMeta<SettingsAppPageProps> = {
  args: { app: "inbox", read: "loaded", images: false, onBack: fn(), onImagesChange, onHandOver, onAndroid },
  decorator: fullHeight,
  examples: {
    "Images unreadable": { read: "failed", onRecover: fn() },
    "Saving images": { saving: true },
    Workflows: { app: "workflows" },
    Calendar: { app: "calendar", grants: { calendar: "allowed" } },
    Camera: { app: "camera", grants: { camera: "allowed", microphone: "off" } },
    Photos: { app: "photos", grants: { photos: "approximate" } },
    Maps: { app: "maps", grants: { location: "off" } },
    Notes: { app: "notes", grants: { microphone: "waiting" } },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onImagesChange.mockClear();
      onHandOver.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("switch", { name: /Load images/ }));
      await userEvent.click(canvas.getByRole("button", { name: "Google and email" }));
      await expect([onImagesChange.mock.calls, onHandOver.mock.calls]).toEqual([[[true]], [["google-and-email"]]]);
    },
    Workflows: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onAndroid.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Alerts/ }));
      await expect(onAndroid.mock.calls).toEqual([[{ target: "workflow-alerts", channel: undefined }]]);
    },
    Photos: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onAndroid.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Photo access/ }));
      await expect(onAndroid.mock.calls).toEqual([[{ target: "photo-permissions", channel: undefined }]]);
    },
  },
};
