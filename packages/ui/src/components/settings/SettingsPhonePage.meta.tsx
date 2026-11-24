import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { fullHeight } from "./samples.ts";
import type { SettingsPhonePageProps } from "./SettingsPhonePage.tsx";

const onRequestHome = fn();

export const meta: ComponentMeta<SettingsPhonePageProps> = {
  args: { home: "alpha", assistant: "alpha", onBack: fn(), onAndroid: fn() },
  decorator: fullHeight,
  examples: {
    "Can set as Home": { home: "another", onRequestHome },
    Requesting: { home: "another", requesting: true },
    "Not on this phone": { home: "not-on-this-phone", assistant: "not-on-this-phone" },
    Waiting: { home: "waiting", assistant: "waiting" },
    Unavailable: { home: "unavailable", assistant: "unavailable" },
  },
  play: {
    "Can set as Home": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRequestHome.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Set as Home" }));
      await expect(onRequestHome.mock.calls.length).toBe(1);
    },
    Requesting: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button", { name: "Set as Home" })).toBeNull(),
  },
};
