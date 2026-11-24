import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { MessageItemProps } from "./MessageItem.tsx";
import { ReactionBar } from "./ReactionBar.tsx";

const onReply = fn();
const onEdit = fn();
const onDelete = fn();
const onReact = fn();
const onRetry = fn();
const onDiscard = fn();
const onOpenThread = fn();
const onJump = fn();

export const meta: ComponentMeta<MessageItemProps> = {
  args: {
    layout: "bubble",
    sender: "Ana Lima",
    own: false,
    time: "14:22",
    body: "Can you review the updated specs before 3?",
    onReply,
    onReact,
  },
  examples: {
    "Own bubble read": {
      layout: "bubble",
      sender: "You",
      own: true,
      edited: true,
      status: "read",
      replyTo: { sender: "Ana Lima", excerpt: "Can you review the updated specs before 3?", onJump },
      body: "On it now — looks clean.",
      onEdit,
      onDelete,
    },
    "Bubble failed": {
      layout: "bubble",
      sender: "You",
      own: true,
      status: "failed",
      errorText: "Offline",
      onRetry,
      onDiscard,
    },
    "Compact Slack thread": {
      layout: "compact",
      sender: "Bruno Costa",
      time: "10:15",
      body: "Pushed the OAuth PKCE flow for user tokens.",
      reactions: <ReactionBar reactions={[{ emoji: "✅", count: 2, reacted: true, label: "Check" }]} onToggle={fn()} />,
      thread: { replyCount: 4, lastReplyTime: "10:41", onOpen: onOpenThread },
      onReply,
      onReact,
    },
    "Compact grouped": {
      layout: "compact",
      sender: "Bruno Costa",
      grouped: true,
      time: "10:16",
      body: "Bot tokens are rejected at the boundary.",
    },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onReply.mockClear();
      onReact.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Reply" }));
      await userEvent.click(canvas.getByRole("button", { name: "React" }));
      await expect([onReply.mock.calls.length, onReact.mock.calls.length]).toEqual([1, 1]);
    },
    "Bubble failed": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRetry.mockClear();
      onDiscard.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Retry" }));
      await userEvent.click(canvas.getByRole("button", { name: "Discard" }));
      await expect([onRetry.mock.calls.length, onDiscard.mock.calls.length]).toEqual([1, 1]);
    },
    "Compact Slack thread": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOpenThread.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: /4 replies/ }));
      await expect(onOpenThread.mock.calls.length).toBe(1);
    },
  },
};
