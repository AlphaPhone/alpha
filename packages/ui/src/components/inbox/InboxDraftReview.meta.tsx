import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxDraftReviewProps } from "./InboxDraftReview.tsx";

const onConfirm = fn();
const onCancel = fn();
const ana = { address: "ana.lima@example.com", valid: true };

export const meta: ComponentMeta<InboxDraftReviewProps> = {
  args: {
    open: true, operation: "send", from: "sam.rivera@gmail.com", to: [ana], cc: [{ address: "bruno@costa.example", valid: true }], bcc: undefined,
    subject: "Lunch on Friday?", attachments: ["Invoice 2041.pdf"], repeat: false, changed: false, confirming: false, onConfirm, onReviewAgain: undefined, onCancel,
  },
  examples: {
    "Confirming": { confirming: true },
    "No recipient": { to: [], cc: [], onConfirm: undefined },
    "Address not accepted": { to: [ana, { address: "daniel@", valid: false }], onConfirm: undefined },
    "May already have gone": { repeat: true },
    "Draft changed": { changed: true, onReviewAgain: fn(), onConfirm: undefined },
    Save: { operation: "save" },
    "Replace Gmail's copy": { operation: "replace" },
    "Delete Gmail's copy": { operation: "deleteCopy", cc: [], attachments: [] },
    "Sending is off": { onConfirm: undefined },
  },
  play: {
    Default: async () => {
      onConfirm.mockClear();
      onCancel.mockClear();
      const sheet = await screen.findByRole("dialog", { name: "Send this email?" });
      await expect(within(sheet).getByText("ana.lima@example.com")).toBeInTheDocument();
      await userEvent.click(within(sheet).getByRole("button", { name: "Send" }));
      await expect(onConfirm.mock.calls.length).toBe(1);
      await userEvent.click(within(sheet).getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(onCancel.mock.calls.length).toBe(1));
    },
    "No recipient": async () => {
      const sheet = await screen.findByRole("dialog", { name: "Send this email?" });
      await expect(within(sheet).getByRole("button", { name: "Send" })).toBeDisabled();
    },
    "Draft changed": async () => {
      const sheet = await screen.findByRole("dialog", { name: "Send this email?" });
      await expect(within(sheet).queryByRole("button", { name: "Send" })).toBeNull();
      await expect(within(sheet).getByRole("button", { name: "Review again" })).toBeInTheDocument();
    },
    "Replace Gmail's copy": async () => {
      const sheet = await screen.findByRole("dialog", { name: "Replace the copy in Gmail?" });
      await expect(within(sheet).getByText("This cannot be undone")).toBeInTheDocument();
    },
  },
};
