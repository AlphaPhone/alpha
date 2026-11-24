import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { fullHeight, reported, unavailable } from "./samples.ts";
import type { SettingsSoundPageProps } from "./SettingsSoundPage.tsx";

const onAndroid = fn();

export const meta: ComponentMeta<SettingsSoundPageProps> = {
  args: { sound: reported("Vibrate"), onBack: fn(), onAndroid },
  decorator: fullHeight,
  examples: { Unavailable: { sound: unavailable }, "Nearby page": { told: "nearby" } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onAndroid.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Do Not Disturb/ }));
      await expect(onAndroid.mock.calls).toEqual([[{ target: "do-not-disturb", channel: undefined }]]);
    },
  },
};
