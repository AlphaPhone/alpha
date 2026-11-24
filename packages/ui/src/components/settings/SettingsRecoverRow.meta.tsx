import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { inGroup } from "./samples.ts";
import type { SettingsRecoverRowProps } from "./SettingsRecoverRow.tsx";

const onRecover = fn();

export const meta: ComponentMeta<SettingsRecoverRowProps> = {
  args: { store: "device-preferences", onRecover },
  decorator: inGroup,
  examples: { Busy: { busy: true } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRecover.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Recover device settings" }));
      await expect(onRecover.mock.calls.length).toBe(1);
    },
    Busy: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button")).toBeNull(),
  },
};
