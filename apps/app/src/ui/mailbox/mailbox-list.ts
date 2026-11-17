/**
 * The mailbox list's notices and empty-state text, and the metadata-only attention summary Home
 * shows. Folder queries, paging, the list and body caches and saved-snapshot validation stay
 * upstream (`@elizaos/plugin-inbox/mailbox/mailbox-list`).
 */
import { MAILBOX_FOLDER_QUERY } from "@elizaos/plugin-inbox/mailbox/mailbox-list";
import type { GmailMessage } from "@elizaos/plugin-inbox/mailbox/types";

/** Shown when a later page came from a mailbox that changed after the first page. */
export const MAILBOX_CHANGED_NOTICE =
  "Newer mail arrived while this list was loading and is not shown yet. Load newer mail to read the list again.";

/** Plain status for a loaded list. */
export function mailboxListStatus(count: number, query: string): string {
  if (count) return `${count} messages loaded`;
  if (query === MAILBOX_FOLDER_QUERY.inbox) return "Your Inbox is empty";
  if (query === MAILBOX_FOLDER_QUERY.sent) return "No sent messages";
  if (query === MAILBOX_FOLDER_QUERY.archive) return "No archived messages";
  if (query === MAILBOX_FOLDER_QUERY.trash) return "Trash is empty";
  return "No messages match this search";
}

/**
 * What a Home surface may show about mail. Only counts, the account label and
 * a time leave the Inbox: no subject, sender or body. `unreadMore` means the
 * bounded query or loaded pages did not see every message; `unread` stays
 * undefined until a page was read, so a stale or loading state never claims a
 * count it did not see.
 */
export interface InboxAttention {
  state: "not-connected" | "loading" | "ready" | "error" | "stale";
  unread: number | undefined;
  unreadMore: boolean;
  source: string | null;
  updatedAt: string | null;
}

/** Attention for loaded Inbox messages; `updatedAt` is never newer than the oldest data counted. */
export function inboxAttentionFor(
  messages: ReadonlyArray<Pick<GmailMessage, "unread">>,
  more: boolean,
  source: string | null,
  updatedAt: string,
  state: "ready" | "stale" = "ready",
): InboxAttention {
  return {
    state,
    unread: messages.filter((m) => m.unread).length,
    unreadMore: more,
    source,
    updatedAt,
  };
}
