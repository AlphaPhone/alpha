import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { SettingsResetNoticeProps } from "./SettingsResetNotice.tsx";

const onTryAgain = fn();

export const meta: ComponentMeta<SettingsResetNoticeProps> = {
  args: { said: "not-erased" },
  examples: { "Try again": { said: "could-not-tell", onTryAgain } },
  play: {
    "Try again": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onTryAgain.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Try again" }));
      await expect(onTryAgain.mock.calls.length).toBe(1);
    },
  },
};
