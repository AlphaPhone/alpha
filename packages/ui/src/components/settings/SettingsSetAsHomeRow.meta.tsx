import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { inGroup } from "./samples.ts";
import type { SettingsSetAsHomeRowProps } from "./SettingsSetAsHomeRow.tsx";

const onRequest = fn();

export const meta: ComponentMeta<SettingsSetAsHomeRowProps> = {
  args: { onRequest },
  decorator: inGroup,
  examples: { Requesting: { requesting: true } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRequest.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Set as Home" }));
      await expect(onRequest.mock.calls.length).toBe(1);
    },
    Requesting: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRequest.mockClear();
      const canvas = within(canvasElement);
      await expect(canvas.getByRole("status", { name: "Waiting for Android" })).toBeTruthy();
      await expect(canvas.queryByRole("button")).toBeNull();
    },
  },
};
