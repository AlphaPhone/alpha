import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxThreadNavProps } from "./InboxThreadNav.tsx";

const onOlder = fn();
const onNewer = fn();

export const meta: ComponentMeta<InboxThreadNavProps> = {
  args: { place: 2, count: 3, onOlder, onNewer },
  examples: {
    Oldest: { place: 1, onOlder: undefined },
    Newest: { place: 3, onNewer: undefined },
    "Alone in its thread": { place: 1, count: 1, onOlder: undefined, onNewer: undefined },
    "Sibling previews": {
      place: 3, onNewer: undefined,
      threadRows: [
        { position: 0, sender: "Ana Lima", date: "Oct 31", snippet: "Can you make it on Friday?", onOpen: fn() },
        { position: 1, sender: "Sam Rivera", date: "09:10", snippet: "Yes, let's go to the café.", onOpen: fn() },
      ],
    },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOlder.mockClear();
      onNewer.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Earlier messages" }));
      await userEvent.click(canvas.getByRole("button", { name: "More messages" }));
      await expect([onOlder.mock.calls.length, onNewer.mock.calls.length]).toEqual([1, 1]);
    },
    Oldest: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      await expect(within(canvasElement).queryByRole("button", { name: "Earlier messages" })).toBeNull();
    },
  },
};
