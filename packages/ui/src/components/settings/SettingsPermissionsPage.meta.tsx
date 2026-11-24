import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { fullHeight } from "./samples.ts";
import type { SettingsPermissionsPageProps } from "./SettingsPermissionsPage.tsx";

const onReview = fn();

export const meta: ComponentMeta<SettingsPermissionsPageProps> = {
  args: {
    grants: { camera: "allowed", microphone: "off", location: "approximate", calendar: "allowed", photos: "unavailable", files: "off", notifications: "allowed" },
    onBack: fn(),
    onReview,
    onAndroid: fn(),
  },
  decorator: fullHeight,
  examples: {
    Waiting: { grants: { camera: "waiting", microphone: "waiting", location: "waiting", calendar: "waiting", photos: "waiting", files: "waiting", notifications: "waiting" } },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onReview.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Microphone/ }));
      await expect(onReview.mock.calls).toEqual([["microphone"]]);
    },
  },
};
