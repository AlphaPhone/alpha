import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxChangeReviewProps } from "./InboxChangeReview.tsx";
import { sampleRows } from "./samples.ts";

const onConfirm = fn();
const onCancel = fn();
const messages = sampleRows.slice(0, 3).map(({ id, sender, subject }) => ({ id, sender, subject }));

export const meta: ComponentMeta<InboxChangeReviewProps> = {
  args: { open: true, operation: "archive", messages, changed: false, confirming: false, onConfirm, onCancel },
  examples: {
    "One email": { messages: messages.slice(0, 1) },
    Many: { messages: [...messages, ...sampleRows.map(({ id, sender, subject }) => ({ id: `x${id}`, sender, subject }))] },
    Trash: { operation: "trash" },
    "Move back to the Inbox": { operation: "unarchive" },
    "Take out of Trash": { operation: "untrash" },
    "Emails changed": { changed: true, onConfirm: undefined },
    Confirming: { confirming: true },
    "Access withdrawn": { onConfirm: undefined },
  },
  play: {
    Default: async () => {
      onConfirm.mockClear();
      onCancel.mockClear();
      const sheet = await screen.findByRole("dialog", { name: "Archive?" });
      await expect(sheet).toHaveAccessibleDescription("3 emails");
      await userEvent.click(within(sheet).getByRole("button", { name: "Archive" }));
      await expect(onConfirm).toHaveBeenCalledTimes(1);
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
    },
    "Emails changed": async () => {
      const sheet = await screen.findByRole("dialog", { name: "Archive?" });
      await expect(within(sheet).queryByRole("button", { name: "Archive" })).toBeNull();
    },
  },
};
