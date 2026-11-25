import { X } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Banner, type BannerProps } from "../Banner.tsx";
import { Button } from "../Button.tsx";

type Notice = { variant: NonNullable<BannerProps["variant"]>; text: string; action?: string };

const notices = {
  savedList: { variant: "info", text: "Saved list", action: "Refresh" },
  listOutOfDate: { variant: "warn", text: "This list may be out of date", action: "Refresh" },
  newerMailMissing: { variant: "info", text: "Newer mail may be missing", action: "Refresh" },
  savedMessage: { variant: "info", text: "Saved copy. Links and attachments are off." },
  imagesHidden: { variant: "info", text: "Images are hidden", action: "Show images" },
  reconnect: { variant: "warn", text: "Gmail access was withdrawn", action: "Reconnect Gmail" },
  offline: { variant: "warn", text: "You are offline", action: "Try again" },
  unreachable: { variant: "warn", text: "Gmail could not be reached", action: "Try again" },
  sendingOff: { variant: "warn", text: "Sending is off for this account", action: "Turn on" },
  noReplyAddress: { variant: "warn", text: "No address to reply to" },
  notEditable: { variant: "warn", text: "Alpha cannot edit this draft safely", action: "Open in Gmail" },
  forwardTextOnly: { variant: "info", text: "Forwarded as text: this account cannot forward the attachments" },
  mineRestored: { variant: "info", text: "Your edits are kept" },
  savedTaken: { variant: "info", text: "Using the latest saved draft" },
  saveFound: { variant: "info", text: "Your save reached Gmail" },
  saveNotFound: { variant: "warn", text: "Your save did not reach Gmail" },
  copyDeleted: { variant: "info", text: "Gmail's copy was deleted. Your draft is on this phone." },
  copyNotDeleted: { variant: "warn", text: "Gmail's copy was not deleted" },
  checkingGmailCopy: { variant: "info", text: "Checking Gmail's copy…" },
  gmailCopyUnknown: { variant: "warn", text: "Alpha cannot confirm what happened to Gmail's copy", action: "Check Gmail copy" },
  fileTooBig: { variant: "warn", text: "That file is too large" },
  fileUnreadable: { variant: "warn", text: "That file cannot be read" },
  noRoom: { variant: "warn", text: "No room for that file" },
  contactsInSettings: { variant: "warn", text: "Allow Contacts in Settings", action: "Open Settings" },
  noContacts: { variant: "info", text: "No contacts on this phone" },
  markBusy: { variant: "info", text: "Still marking another message" },
  markFailed: { variant: "warn", text: "Gmail did not mark it" },
  markUnconfirmed: { variant: "warn", text: "Not sure it was marked. Refresh first.", action: "Refresh" },
  selectAgain: { variant: "warn", text: "These emails changed. Select them again." },
  mayHaveGone: { variant: "warn", text: "It may already have gone" },
  cannotUndo: { variant: "warn", text: "This cannot be undone" },
  needsRecipient: { variant: "warn", text: "Add a recipient Gmail accepts first" },
  draftChanged: { variant: "warn", text: "The draft changed. Review it again.", action: "Review" },
  suggestionTooLong: { variant: "warn", text: "Too long to add" },
} as const satisfies Record<string, Notice>;

export type InboxNoticeKind = keyof typeof notices;

export type InboxNoticeProps = {
  /** What the owner is told. */
  kind: InboxNoticeKind;
  /** Does the one thing about it, such as Refresh; its button is shown only with it, and only for a notice that has one. */
  onAction?: () => void;
  /** Puts the notice away; its button is shown only with it. */
  onDismiss?: () => void;
  /** Drawn as the list's quiet status line, its action a chip under it, as develop's list tells what it knows. */
  plain?: boolean;
};

/**
 * A short notice in the flow of an Inbox screen: the state the list, a message or a draft is in, with the one thing to
 * do about it.
 *
 * @model spec/app/inbox/index.md
 */
export function InboxNotice({ kind, onAction, onDismiss, plain = false }: InboxNoticeProps) {
  const { variant, text, ...rest } = notices[kind] as Notice;
  if (plain) {
    return (
      <div className="flex flex-col items-start gap-2 px-1 pb-2">
        <p role="status" className="text-xs text-muted-foreground">{text}</p>
        {onAction && rest.action ? <button type="button" onClick={onAction} className={cn(focusRing, "min-h-9 rounded-action bg-secondary px-3 text-caption whitespace-nowrap text-secondary-foreground")}>{rest.action}</button> : null}
      </div>
    );
  }
  return (
    <Banner
      variant={variant}
      action={
        onAction && rest.action || onDismiss ? (
          <>
            {onAction && rest.action ? <Button variant="ghost" size="sm" onClick={onAction}>{rest.action}</Button> : null}
            {onDismiss ? <Button variant="ghost" size="icon" aria-label="Dismiss" onClick={onDismiss}><X /></Button> : null}
          </>
        ) : undefined
      }
    >
      {text}
    </Banner>
  );
}
