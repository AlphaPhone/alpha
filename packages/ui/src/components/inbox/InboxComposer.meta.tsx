import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxComposerProps } from "./InboxComposer.tsx";
import { sampleAccounts } from "./samples.ts";

const onSend = fn();
const onSetAside = fn();
const onDiscard = fn();
const line = (recipients: { address: string; valid: boolean }[] = []) => ({ recipients, value: "", onValueChange: fn(), onAdd: fn(), onRemove: fn(), onPickContact: undefined });
const none: Partial<InboxComposerProps> = {
  onFromChange: undefined, onRemoveAttachment: undefined, onAttach: undefined, onRestoreMine: undefined, onUseSaved: undefined, notice: undefined, onNoticeAction: undefined,
  outcome: undefined, storage: undefined, onReloadStorage: undefined, onKeepAgain: undefined, onSaveToGmail: undefined, onDeleteGmailCopy: undefined,
};
const ana = { address: "ana.lima@example.com", valid: true };

export const meta: ComponentMeta<InboxComposerProps> = {
  args: {
    ...none, kind: "new", accounts: sampleAccounts.slice(0, 2), from: "1", to: line(), cc: line(), bcc: line(), subject: "", text: "", attachments: [], clash: false,
    keeping: "kept", gmail: "none", sent: "none", onSend, onSetAside, onDiscard, onSubjectChange: fn(), onTextChange: fn(),
  },
  examples: {
    "New message": { onFromChange: fn(), onAttach: fn(), to: { ...line(), onPickContact: fn() } },
    "Reply to everyone": { kind: "replyAll", to: line([ana]), cc: line([{ address: "bruno@costa.example", valid: true }]), subject: "Re: Lunch on Friday and the long list of things that we still need to settle before the offsite", text: "Friday at one works for me. ".repeat(30), onAttach: fn() },
    Forward: { kind: "forward", to: line(), subject: "Fwd: Invoice 2041", text: "Please see below.", attachments: [{ id: "1", name: "Invoice 2041.pdf" }], onRemoveAttachment: fn() },
    "Forward as text": { kind: "forward", subject: "Fwd: Invoice 2041", notice: "forwardTextOnly" },
    "Saved in Gmail": { kind: "saved", to: line([ana]), subject: "Lunch on Friday?", text: "Draft text", gmail: "saved", onSaveToGmail: fn(), onDeleteGmailCopy: fn() },
    "Address not accepted": { to: line([ana, { address: "daniel@", valid: false }]), subject: "Hello" },
    "Not kept on the phone": { keeping: "notKept", onKeepAgain: fn(), subject: "Hello", text: "Typed since" },
    "Clash with Gmail": { clash: true, gmail: "clash", onRestoreMine: fn(), onUseSaved: fn(), onSaveToGmail: fn(), to: line([ana]), subject: "Hello" },
    "Send not known": { outcome: { outcome: "unknown", onCheckSent: fn(), onSendAgain: fn() }, sent: "none", to: line([ana]), subject: "Hello" },
    "Checking local draft": { storage: "checking", onSend: undefined, onDiscard: undefined, onSetAside: undefined },
    "Local draft storage unavailable": { storage: "unavailable", onReloadStorage: fn(), onSend: undefined, onDiscard: undefined, onSetAside: undefined },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onSend.mockClear();
      onSetAside.mockClear();
      onDiscard.mockClear();
      const canvas = within(canvasElement);
      await expect(canvas.getAllByRole("heading").length).toBe(1);
      await userEvent.click(canvas.getByRole("button", { name: "Send email" }));
      await userEvent.click(canvas.getByRole("button", { name: "Back from draft" }));
      await userEvent.click(canvas.getByRole("button", { name: "Draft actions" }));
      await userEvent.click(await screen.findByRole("menuitem", { name: "Discard" }));
      await waitFor(() => expect([onSend.mock.calls.length, onSetAside.mock.calls.length, onDiscard.mock.calls.length, screen.queryByRole("menu")]).toEqual([1, 1, 1, null]));
    },
    "Reply to everyone": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Remove bruno@costa.example" }));
      await expect(within(canvasElement).getByRole("group", { name: "Bcc" })).toBeInTheDocument();
    },
    "Checking local draft": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("textbox", { name: "Subject" })).toBeNull(),
  },
};
