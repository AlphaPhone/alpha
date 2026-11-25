import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantMessageDraftCardProps } from "./AssistantMessageDraftCard.tsx";

const onBodyChange = fn();
const onSend = fn();
const onOpenInApp = fn();
const onDecline = fn();

export const meta: ComponentMeta<AssistantMessageDraftCardProps> = {
  args: {
    platform: "Slack",
    target: "Acme · #design",
    replyContext: "In thread: Token contrast check",
    body: "I will join the review in five minutes.",
    status: "draft",
    onBodyChange,
    onSend,
    onOpenInApp,
    onDecline,
  },
  examples: {
    "Telegram sending": {
      platform: "Telegram",
      target: "Ana Lima",
      replyContext: "Replying to: Are we still on?",
      status: "sending",
    },
    Sent: {
      status: "sent",
    },
    Failed: {
      status: "failed",
      error: "Connection dropped before delivery.",
    },
    Unknown: {
      status: "unknown",
    },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onBodyChange.mockClear();
      onSend.mockClear();
      onOpenInApp.mockClear();
      onDecline.mockClear();
      const canvas = within(canvasElement);
      await userEvent.type(canvas.getByRole("textbox", { name: "Message to Acme · #design" }), "!");
      await userEvent.click(canvas.getByRole("button", { name: "Send" }));
      await userEvent.click(canvas.getByRole("button", { name: "Open in app" }));
      await userEvent.click(canvas.getByRole("button", { name: "Decline" }));
      await expect([onBodyChange.mock.calls.length, onSend.mock.calls.length, onOpenInApp.mock.calls.length, onDecline.mock.calls.length]).toEqual([1, 1, 1, 1]);
    },
    Unknown: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await expect(canvas.queryByRole("button", { name: "Send" })).toBeNull();
      await expect(canvas.getByRole("button", { name: "Open in app" })).toBeTruthy();
    },
  },
};
