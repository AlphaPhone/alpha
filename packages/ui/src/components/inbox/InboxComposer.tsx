import { useState } from "react";
import { ChevronDown, ChevronLeft, Cloud, CloudOff, Ellipsis, Mail, Paperclip, Send, Trash2, TriangleAlert, X } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../Menu.tsx";
import type { InboxAccount } from "./InboxAccountList.tsx";
import { InboxDraftClash, type InboxDraftClashProps } from "./InboxDraftClash.tsx";
import { InboxDraftStatus, type InboxDraftStatusProps } from "./InboxDraftStatus.tsx";
import { InboxFromField } from "./InboxFromField.tsx";
import { InboxHeader, inboxHeaderButton, inboxMenu } from "./InboxHeader.tsx";
import { InboxNotice, type InboxNoticeKind } from "./InboxNotice.tsx";
import { InboxRecipientField, type InboxRecipientFieldProps, inboxLineButton } from "./InboxRecipientField.tsx";
import { InboxSendOutcome, type InboxSendOutcomeProps } from "./InboxSendOutcome.tsx";

const titles = { new: "New email", reply: "Reply", replyAll: "Reply all", forward: "Forward", saved: "Draft" } as const;

type Line = Omit<InboxRecipientFieldProps, "label">;

export type InboxComposerProps = Pick<InboxDraftStatusProps, "keeping" | "gmail" | "sent"> &
  Partial<Pick<InboxDraftClashProps, "onRestoreMine" | "onUseSaved">> & {
    /** How the draft began, which is the screen's one title. */
    kind: keyof typeof titles;
    /** The accounts the message may be sent from. */
    accounts: InboxAccount[];
    /** The account it is sent from. */
    from: string;
    /** Changes the account; offered only for a new message with no copy in Gmail and no address half typed. */
    onFromChange?: (id: string) => void;
    /** The To line. */
    to: Line;
    /** The Cc line. */
    cc: Line;
    /** The Bcc line. */
    bcc: Line;
    /** The subject. */
    subject: string;
    /** Called with the subject as it is typed; each change is an edit, written to the phone once typing pauses. */
    onSubjectChange: (value: string) => void;
    /** The text of the message. */
    text: string;
    /** Called with the text as it is typed. */
    onTextChange: (value: string) => void;
    /** The attachments so far. */
    attachments: { id: string; name: string }[];
    /** Removes an attachment. */
    onRemoveAttachment?: (id: string) => void;
    /** Opens the picker for a file; offered while the account has room for another. */
    onAttach?: () => void;
    /** The draft is at a clash: Gmail's copy changed meanwhile, and the owner chooses whose to keep. */
    clash?: boolean;
    /** Something to tell: sending is off, no address to reply to, which copy was kept, a file refused, and the like. */
    notice?: InboxNoticeKind;
    /** Does the one thing the notice offers. */
    onNoticeAction?: () => void;
    /** How the last send ended, while it is worth telling. */
    outcome?: InboxSendOutcomeProps;
    /** The phone's drafts are being looked up after a restart, or cannot be read; the form is not shown until they are. */
    storage?: "checking" | "unavailable";
    /** Looks up the phone's drafts again. */
    onReloadStorage?: () => void;
    /** Keeps the draft on the phone again after a failed write. */
    onKeepAgain?: () => void;
    /** Reviews sending, which is where recipients, subject and attachments are shown as they would go. */
    onSend?: () => void;
    /** Reviews saving it to Gmail's Drafts, or over its copy there. */
    onSaveToGmail?: () => void;
    /** Reads a copy in Gmail before it can be reviewed for replacement. */
    onCheckCopy?: () => void;
    /** Reviews deleting its copy in Gmail's Drafts, which cannot be undone. */
    onDeleteGmailCopy?: () => void;
    /** Sets it aside, whole as it is, and leaves the composer. */
    onSetAside?: () => void;
    /** Asks whether to discard it. */
    onDiscard?: () => void;
  };

/**
 * The composer: one draft being written, kept on the phone as it is typed. A new message, reply, reply all, forward
 * or a draft saved in Gmail, with its recipients, subject, text and attachments, what is known of it, and the ways to
 * send, save, set aside or discard it.
 *
 * @model spec/app/inbox/drafts.md
 */
export function InboxComposer({
  kind, accounts, from, onFromChange, to, cc, bcc, subject, onSubjectChange, text, onTextChange, attachments, onRemoveAttachment, onAttach, clash = false,
  onRestoreMine, onUseSaved, notice, onNoticeAction, outcome, storage, onReloadStorage, keeping, gmail, sent, onKeepAgain, onSend, onSaveToGmail, onCheckCopy, onDeleteGmailCopy, onSetAside, onDiscard,
}: InboxComposerProps) {
  const [more, setMore] = useState(false);
  const showMore = more || cc.recipients.length > 0 || bcc.recipients.length > 0 || cc.value !== "" || bcc.value !== "";
  const menu = onSaveToGmail || onCheckCopy || onDeleteGmailCopy || onDiscard;
  return (
    <div className="flex h-full min-h-0 flex-col bg-background pt-[env(safe-area-inset-top)] text-base text-foreground motion-safe:animate-rise">
      <InboxHeader leading={<button type="button" aria-label="Back from draft" disabled={!onSetAside} onClick={onSetAside} className={inboxHeaderButton}><ChevronLeft className="size-5.5!" /></button>}>
        <h1 className="min-w-0 flex-1 truncate text-body leading-tight font-semibold">{titles[kind]}</h1>
        {menu ? (
          <Menu>
            <MenuTrigger aria-label="Draft actions" className={cn(inboxHeaderButton, "[&_svg]:size-5.5")}><Ellipsis /></MenuTrigger>
            <MenuContent className={inboxMenu}>
              {onSaveToGmail ? <MenuItem onSelect={onSaveToGmail}><Cloud />Save to Gmail</MenuItem> : null}
              {onCheckCopy ? <MenuItem onSelect={onCheckCopy}><Cloud />Check Gmail copy</MenuItem> : null}
              {onDeleteGmailCopy ? <MenuItem onSelect={onDeleteGmailCopy}><CloudOff />Delete Gmail copy</MenuItem> : null}
              {onDiscard ? <MenuItem onSelect={onDiscard}><Trash2 />Discard</MenuItem> : null}
            </MenuContent>
          </Menu>
        ) : null}
        {onAttach ? <button type="button" aria-label="Attach file" onClick={onAttach} className={cn(inboxHeaderButton, "[&_svg]:size-5.5")}><Paperclip /></button> : null}
        <button type="button" aria-label="Send email" disabled={!onSend} onClick={onSend} className={cn(focusRing, "flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground [&_svg]:size-5.5")}><Send /></button>
      </InboxHeader>
      <main aria-label={titles[kind]} tabIndex={0} className={cn(focusRing, "flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain px-5 pb-28 [scrollbar-width:none] focus-visible:-outline-offset-2 *:shrink-0")}>
        {storage ? (
          <div role="status" className="flex flex-col items-center gap-3 px-6 pt-27.5 text-center text-muted-foreground">
            <span aria-hidden className="[&_svg]:size-7">{storage === "checking" ? <Mail /> : <TriangleAlert />}</span>
            <p className="text-base">{storage === "checking" ? "Checking local draft…" : "Local draft storage unavailable"}</p>
            {storage === "unavailable" && onReloadStorage ? <button type="button" onClick={onReloadStorage} className={cn(focusRing, "mt-1 h-9 rounded-full bg-secondary px-4 text-sm font-semibold text-secondary-foreground")}>Try again</button> : null}
          </div>
        ) : (
          <>
            {notice ? <div className="py-2"><InboxNotice kind={notice} onAction={onNoticeAction} /></div> : null}
            {outcome ? <div className="py-2"><InboxSendOutcome {...outcome} /></div> : null}
            {clash && onRestoreMine ? <div className="py-2"><InboxDraftClash onRestoreMine={onRestoreMine} onUseSaved={onUseSaved} /></div> : null}
            <InboxFromField accounts={accounts} value={from} onChange={onFromChange} />
            <InboxRecipientField
              label="To"
              {...to}
              trailing={<button type="button" aria-label="Cc and Bcc" aria-expanded={showMore} disabled={cc.recipients.length > 0 || bcc.recipients.length > 0 || cc.value !== "" || bcc.value !== ""} onClick={() => setMore(!more)} className={inboxLineButton}><ChevronDown aria-hidden /></button>}
            />
            {showMore ? (
              <>
                <InboxRecipientField label="Cc" {...cc} />
                <InboxRecipientField label="Bcc" {...bcc} />
              </>
            ) : null}
            <InboxDraftStatus keeping={keeping} gmail={gmail} sent={sent} onRetry={onKeepAgain} />
            <input
              aria-label="Subject"
              placeholder="Subject"
              value={subject}
              onChange={(event) => onSubjectChange(event.target.value)}
              className="h-13 border-b border-border bg-transparent p-0 text-lg leading-tight font-semibold text-foreground outline-0 placeholder:text-muted-foreground"
            />
            {attachments.length > 0 ? (
              <ul aria-label="Attachments" className="flex flex-col gap-1.5 pt-2.5">
                {attachments.map(({ id, name }) => (
                  <li key={id} className="flex min-h-11 max-w-full items-center gap-2.5 rounded-lg bg-secondary pr-1 pl-3 text-secondary-foreground">
                    <Paperclip aria-hidden className="size-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate text-snippet font-semibold">{name}</span>
                    {onRemoveAttachment ? <button type="button" aria-label={`Remove ${name}`} onClick={() => onRemoveAttachment(id)} className={cn(inboxLineButton, "[&_svg]:size-4")}><X aria-hidden className="text-muted-foreground" /></button> : null}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex min-h-41 flex-1 flex-col">
              <textarea
                aria-label="Message"
                placeholder="Message"
                value={text}
                onChange={(event) => onTextChange(event.target.value)}
                className="min-h-30 flex-1 resize-none bg-transparent p-0 pt-3.5 text-body text-foreground outline-0 placeholder:text-muted-foreground"
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
