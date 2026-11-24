import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { SettingsAgentRecoveryProps } from "./SettingsAgentRecovery.tsx";

const onRecover = fn();

export const meta: ComponentMeta<SettingsAgentRecoveryProps> = {
  args: { connection: "needs-restart", onRecover },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRecover.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Restart Alpha" }));
      await expect(onRecover.mock.calls).toEqual([["restart"]]);
    },
    "Connection needs-retry": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRecover.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Try again" }));
      await expect(onRecover.mock.calls).toEqual([["retry"]]);
    },
    "Connection offline": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button")).toBeNull(),
  },
};
