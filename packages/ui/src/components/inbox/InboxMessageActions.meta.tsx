import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
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
    Compact: { compact: true },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onReply.mockClear();
      onTrash.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Reply" }));
      await userEvent.click(within(canvasElement).getByRole("button", { name: "More actions" }));
      await userEvent.click(await screen.findByRole("menuitem", { name: "Move to Trash" }));
      await waitFor(() => expect([onReply.mock.calls.length, onTrash.mock.calls.length, screen.queryByRole("menu")]).toEqual([1, 1, null]));
    },
    Unread: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: "More actions" }));
      await expect(await screen.findByRole("menuitem", { name: "Mark read" })).toBeInTheDocument();
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    },
    // v119 45f6bed30 prototype/template.html:966 and phone.css:1100: the reader menu's Ask Alpha is the thin-lined mark at 20px, in the row's colour.
    Compact: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: "More actions" }));
      const ask = await screen.findByRole("menuitem", { name: "Ask Alpha" });
      const mark = ask.querySelector("span[aria-hidden]");
      await expect([ask.querySelector("svg"), mark?.classList.contains("size-5"), mark?.classList.contains("bg-current")]).toEqual([null, true, true]);
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    },
    "Read only account": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button", { name: "More actions" })).toBeNull(),
  },
};
