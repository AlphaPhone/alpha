import { expect, fn, screen, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxMessageActionsProps } from "./InboxMessageActions.tsx";

const onReply = fn();
const onReplyAll = fn();
const onForward = fn();
const onToggleRead = fn();
const onArchive = fn();
const onTrash = fn();
const onAskAlpha = fn();
const all = { onReply, onReplyAll, onForward, onToggleRead, onArchive, onTrash, onAskAlpha };
const none = { onReply: undefined, onReplyAll: undefined, onForward: undefined, onToggleRead: undefined, onArchive: undefined, onTrash: undefined, onAskAlpha: undefined };

export const meta: ComponentMeta<InboxMessageActionsProps> = {
  args: { unread: false, ...all },
  examples: {
    Unread: { unread: true },
    "Read only account": { ...none, onAskAlpha },
    "Cannot send": { onReply: undefined, onReplyAll: undefined, onForward: undefined },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onReply.mockClear();
      onTrash.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Reply" }));
      await userEvent.click(within(canvasElement).getByRole("button", { name: "More actions" }));
      await userEvent.click(await screen.findByRole("menuitem", { name: "Move to Trash" }));
      await expect([onReply.mock.calls.length, onTrash.mock.calls.length]).toEqual([1, 1]);
    },
    Unread: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: "More actions" }));
      await expect(await screen.findByRole("menuitem", { name: "Mark as read" })).toBeInTheDocument();
      await userEvent.keyboard("{Escape}");
    },
    "Read only account": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button", { name: "More actions" })).toBeNull(),
  },
};
