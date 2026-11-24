import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxDiscardDialogProps } from "./InboxDiscardDialog.tsx";

const onDiscard = fn();
const onKeep = fn();

export const meta: ComponentMeta<InboxDiscardDialogProps> = {
  args: { open: true, gmailCopy: false, onDiscard, onKeep },
  examples: { "Saved in Gmail": { gmailCopy: true }, Closed: { open: false } },
  play: {
    Default: async () => {
      onDiscard.mockClear();
      onKeep.mockClear();
      const dialog = await screen.findByRole("alertdialog", { name: "Discard this draft?" });
      await expect(within(dialog).getByRole("button", { name: "Keep" })).toHaveFocus();
      await userEvent.click(within(dialog).getByRole("button", { name: "Keep" }));
      await waitFor(() => expect([onDiscard.mock.calls.length, onKeep.mock.calls.length]).toEqual([0, 1]));
    },
    "Saved in Gmail": async () => {
      await expect(await screen.findByRole("alertdialog")).toHaveAccessibleDescription("Its copy in Gmail Drafts stays there.");
    },
  },
};
