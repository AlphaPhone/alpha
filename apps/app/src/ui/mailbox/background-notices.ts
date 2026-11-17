/**
 * Settings status text for the background new-mail check (decision P-14). The renderer bridge,
 * its status record and notice taps stay upstream (`@elizaos/plugin-inbox/mailbox/background-notices`);
 * Alpha owns what the owner is told.
 */
import type { MailBackgroundStatus } from "@elizaos/plugin-inbox/mailbox/background-notices";

/** Owner-facing status text for Settings. Never claims a check that did not happen. */
export function mailBackgroundMessage(
  value: MailBackgroundStatus,
  locale?: string,
): string {
  const checked = value.lastSyncAt
    ? ` Last successful check: ${new Date(value.lastSyncAt).toLocaleString(locale)}.`
    : " No successful background check yet.";
  const suffix = `${checked} Android may delay checks in Doze or battery saver. Open Inbox to check current mail.`;
  switch (value.status) {
    case "web-unavailable":
      return "Background Gmail notices are available in the Android app.";
    case "disabled":
      return "Open Inbox and select a connected Gmail account to enable background checks.";
    case "unsupported":
      return `Background Gmail is unavailable on this server. Open Inbox to check mail.${checked}`;
    case "grant-unavailable":
      return "Gmail background checks need the matching Cloud sign-in and Google read access. Recheck the account in Inbox.";
    case "capacity-reached":
      return "Gmail notice history is full. Background catch-up is incomplete; open Inbox to review current mail.";
    case "retrying":
    case "unavailable":
      return `Gmail background checks are unavailable or waiting to retry. Saved progress is retained.${suffix}`;
  }
  const phase =
    value.status === "history-expired"
      ? "Gmail history expired. Earlier missed messages were not reconciled."
      : value.status === "catching-up"
        ? "Gmail changes are still being reconciled."
        : "Watching for new unread Inbox messages. Earlier mailbox changes were not backfilled.";
  return (
    phase +
    (value.notificationsAllowed === false
      ? " Android notifications or this channel are disabled."
      : "") +
    (value.uncertainNotices
      ? " Some notification attempts have unknown outcomes and will not be repeated."
      : "") +
    suffix
  );
}
