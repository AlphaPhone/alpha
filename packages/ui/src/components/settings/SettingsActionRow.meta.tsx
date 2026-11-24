import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { inGroup } from "./samples.ts";
import type { SettingsActionRowProps } from "./SettingsActionRow.tsx";

const onDecline = fn();
const onReconcile = fn();

export const meta: ComponentMeta<SettingsActionRowProps> = {
  args: { title: "Add lunch with Bruno to Calendar", detail: "Monday, 12:30", onDecline, onReconcile },
  decorator: inGroup,
  examples: {
    Proposed: { title: "Open the Lisbon flights page in Browser", detail: "Waiting for your word", declinable: true },
    Unsettled: { title: "Send a photo of the receipt to Ana", detail: "Yesterday, 18:20", unsettled: true },
  },
  play: {
    Proposed: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onDecline.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Decline" }));
      await expect(onDecline.mock.calls.length).toBe(1);
    },
    Unsettled: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onReconcile.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Happened" }));
      await userEvent.click(canvas.getByRole("button", { name: "Didn’t" }));
      await expect(onReconcile.mock.calls).toEqual([[true], [false]]);
    },
    Default: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button")).toBeNull(),
  },
};
