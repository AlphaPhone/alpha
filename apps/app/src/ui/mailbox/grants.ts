/**
 * The Gmail and Calendar access labels Alpha shows for connected Google accounts. The grant policy
 * they describe stays upstream (`@elizaos/plugin-inbox/mailbox/grants`).
 */
import {
  GMAIL_READ_CAPABILITY,
  gmailGrantTier,
  gmailReadable,
} from "@elizaos/plugin-inbox/mailbox/grants";
import type { GmailAccount } from "@elizaos/plugin-inbox/mailbox/types";

/** Describe the actual incremental grant, including send-only consent. */
export function googleAccountAccessLabel(account: GmailAccount): string {
  const caps = account.grantedCapabilities;
  const gmail =
    gmailGrantTier(account) === "modify"
      ? "Read and change access"
      : caps.includes("google.gmail.send")
        ? "Read and send access"
        : caps.includes(GMAIL_READ_CAPABILITY)
          ? "Read access"
          : "Not authorized";
  const calendar = caps.includes("google.calendar.write")
    ? "Read and edit access"
    : caps.includes("google.calendar.read")
      ? "Read access"
      : "Not authorized";
  return `Connected · Gmail: ${gmail} · Calendar: ${calendar}`;
}

export function gmailGrantLabel(accounts: readonly GmailAccount[]): string {
  const tiers = accounts.map(gmailGrantTier);
  if (tiers.includes("modify")) return "Read and change access authorized";
  if (
    accounts.some(
      (account) =>
        gmailReadable(account) &&
        account.grantedCapabilities.includes("google.gmail.send"),
    )
  )
    return "Read and send access authorized";
  return tiers.includes("readonly")
    ? "Read access authorized"
    : "Authorization required";
}

/**
 * The label the shared Gmail client (`ManagedGmailMailboxClient.googleConnection` in
 * `plugins/plugin-inbox/src/mailbox/managed-gmail-client.ts`) gives a connection that names neither
 * an email nor a name. It is replaced by {@link UNNAMED_GOOGLE_ACCOUNT} and never shown.
 */
export const SHARED_UNNAMED_GOOGLE_ACCOUNT = "Google account";
/** Alpha's label for a connected Google account with no email or name. */
export const UNNAMED_GOOGLE_ACCOUNT = "Gmail account";

/** The account with Alpha's label in place of the shared client's fallback. */
export function withGmailAccountLabel<T extends { label: string }>(account: T): T {
  return account.label === SHARED_UNNAMED_GOOGLE_ACCOUNT ? { ...account, label: UNNAMED_GOOGLE_ACCOUNT } : account;
}
