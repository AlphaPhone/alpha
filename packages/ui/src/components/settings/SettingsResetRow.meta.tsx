import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { inGroup } from "./samples.ts";
import type { SettingsResetRowProps } from "./SettingsResetRow.tsx";

const onErase = fn();

export const meta: ComponentMeta<SettingsResetRowProps> = {
  args: { onErase },
  decorator: inGroup,
  examples: { Reviewing: { reviewing: true }, "Not offered": { onErase: undefined } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onErase.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Erase all data" }));
      await expect(onErase.mock.calls.length).toBe(1);
    },
    Reviewing: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await expect(canvas.getByRole("status", { name: "Waiting for the phone" })).toBeTruthy();
      await expect(canvas.queryByRole("button")).toBeNull();
    },
    "Not offered": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button")).toBeNull(),
  },
};
