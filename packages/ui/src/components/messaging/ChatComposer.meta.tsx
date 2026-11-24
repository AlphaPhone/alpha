import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { ChatComposerProps } from "./ChatComposer.tsx";

const onValueChange = fn();
const onSend = fn();
const onTalk = fn();
const onSwapTarget = fn();
const onCancelContext = fn();
const onBroadcastChange = fn();
const onDraftSend = fn();
const onDraftEdit = fn();
const onDraftUndo = fn();

export const meta: ComponentMeta<ChatComposerProps> = {
  args: {
    target: "chat",
    value: "",
    placeholder: "Message Ana",
    onValueChange,
    onSwapTarget,
    onTalk,
    onSend,
  },
  examples: {
    Writing: {
      value: "See you at 3!",
      onSend,
    },
    "Replying with broadcast": {
      value: "Joining in five minutes",
      placeholder: "Reply in thread",
      context: { kind: "reply", sender: "Bruno", excerpt: "Anyone free for a quick sync?" },
      onCancelContext,
      broadcast: false,
      onBroadcastChange,
      onSend,
    },
    Editing: {
      value: "Updated message text",
      context: { kind: "edit", excerpt: "Original message text" },
      onCancelContext,
      sendLabel: "Save edit",
      onSend,
    },
    "Ask Alpha target": {
      target: "alpha",
      targetAvatar: { name: "Ana Lima" },
      placeholder: "Ask Alpha",
      value: "Draft a short reply saying I am running 5m late",
      onSend,
    },
    "Alpha staged draft": {
      value: "",
      stagedDraft: {
        text: "Running 5 minutes late — see you shortly!",
        onSend: onDraftSend,
        onEdit: onDraftEdit,
        onUndo: onDraftUndo,
      },
    },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onValueChange.mockClear();
      onSwapTarget.mockClear();
      const canvas = within(canvasElement);
      await userEvent.type(canvas.getByRole("textbox", { name: "Message Ana" }), "Hi");
      await userEvent.click(canvas.getByRole("button", { name: "Ask Alpha" }));
      await expect([onValueChange.mock.calls.length, onSwapTarget.mock.calls.length]).toEqual([2, 1]);
    },
    "Alpha staged draft": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onDraftSend.mockClear();
      onDraftEdit.mockClear();
      onDraftUndo.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Send" }));
      await userEvent.click(canvas.getByRole("button", { name: "Edit" }));
      await userEvent.click(canvas.getByRole("button", { name: "Undo" }));
      await expect([onDraftSend.mock.calls.length, onDraftEdit.mock.calls.length, onDraftUndo.mock.calls.length]).toEqual([1, 1, 1]);
    },
    "Replying with broadcast": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onBroadcastChange.mockClear();
      onCancelContext.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("checkbox", { name: "Also send to channel" }));
      await userEvent.click(canvas.getByRole("button", { name: "Cancel reply" }));
      await expect([onBroadcastChange.mock.calls, onCancelContext.mock.calls.length]).toEqual([[[true]], 1]);
    },
  },
};
