import type { ComponentMeta } from "vibestack/stories";
import type { MailListProps } from "./MailList.tsx";
import { failedList, inboxList, notSelecting, picking, savedList, shiftedList } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<MailListProps> = {
  args: {
    mailbox: inboxList, selection: notSelecting, readOnly: false, onOpen: none, onLoadMore: none, onRetry: none,
    onToggle: none, onPickAll: none, onReview: none, onFinishSelecting: none,
  },
  examples: {
    NewerMail: { mailbox: shiftedList },
    SavedMail: { mailbox: savedList, readOnly: true },
    Failed: { mailbox: failedList },
    Selecting: { selection: picking },
  },
};
