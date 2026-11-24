import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxThreadNavProps } from "./InboxThreadNav.tsx";

const onOlder = fn();
const onNewer = fn();

export const meta: ComponentMeta<InboxThreadNavProps> = {
  args: { place: 2, count: 3, onOlder, onNewer },
  examples: { Oldest: { place: 1, onOlder: undefined }, Newest: { place: 3, onNewer: undefined }, "Alone in its thread": { place: 1, count: 1, onOlder: undefined, onNewer: undefined } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOlder.mockClear();
      onNewer.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Previous message" }));
      await userEvent.click(canvas.getByRole("button", { name: "Next message" }));
      await expect([onOlder.mock.calls.length, onNewer.mock.calls.length]).toEqual([1, 1]);
    },
    Oldest: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      await expect(within(canvasElement).getByRole("button", { name: "Previous message" })).toBeDisabled();
    },
  },
};
