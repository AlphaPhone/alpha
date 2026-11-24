import { useState } from "react";
import { ChevronLeft, Cloud, CloudOff, Ellipsis, Paperclip, Send, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "../Button.tsx";
import { EmptyState } from "../EmptyState.tsx";
import { Input } from "../Input.tsx";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../Menu.tsx";
import { Screen } from "../Screen.tsx";
import { Spinner } from "../Spinner.tsx";
import { Textarea } from "../Textarea.tsx";
import type { InboxAccount } from "./InboxAccountList.tsx";
import { InboxDraftClash, type InboxDraftClashProps } from "./InboxDraftClash.tsx";
import { InboxDraftStatus, type InboxDraftStatusProps } from "./InboxDraftStatus.tsx";
import { InboxFromField } from "./InboxFromField.tsx";
import { InboxNotice, type InboxNoticeKind } from "./InboxNotice.tsx";
import { InboxPill } from "./InboxPill.tsx";
import { InboxRecipientField, type InboxRecipientFieldProps } from "./InboxRecipientField.tsx";
import { InboxSendOutcome, type InboxSendOutcomeProps } from "./InboxSendOutcome.tsx";

const titles = { new: "New message", reply: "Reply", replyAll: "Reply all", forward: "Forward", saved: "Draft" } as const;

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
    <Screen
      title={titles[kind]}
      leading={<Button variant="ghost" size="icon" aria-label="Set aside" disabled={!onSetAside} onClick={onSetAside}><ChevronLeft /></Button>}
      actions={
        <>
          {onSend ? <Button size="icon" aria-label="Send" onClick={onSend}><Send /></Button> : null}
          {menu ? (
            <Menu>
              <MenuTrigger asChild><Button variant="ghost" size="icon" aria-label="More actions"><Ellipsis /></Button></MenuTrigger>
              <MenuContent>
                {onSaveToGmail ? <MenuItem onSelect={onSaveToGmail}><Cloud />Save to Gmail</MenuItem> : null}
                {onCheckCopy ? <MenuItem onSelect={onCheckCopy}><Cloud />Check Gmail copy</MenuItem> : null}
                {onDeleteGmailCopy ? <MenuItem destructive onSelect={onDeleteGmailCopy}><CloudOff />Delete Gmail copy</MenuItem> : null}
                {onDiscard ? <MenuItem destructive onSelect={onDiscard}><Trash2 />Discard</MenuItem> : null}
              </MenuContent>
            </Menu>
          ) : null}
        </>
      }
    >
      {storage ? (
        <EmptyState role="status" icon={storage === "checking" ? <Spinner /> : <TriangleAlert />} title={storage === "checking" ? "Checking local draft…" : "Local draft storage unavailable"}>
          {storage === "unavailable" && onReloadStorage ? <Button onClick={onReloadStorage}>Try again</Button> : null}
        </EmptyState>
      ) : (
        <>
          {notice ? <InboxNotice kind={notice} onAction={onNoticeAction} /> : null}
          {outcome ? <InboxSendOutcome {...outcome} /> : null}
          {clash && onRestoreMine ? <InboxDraftClash onRestoreMine={onRestoreMine} onUseSaved={onUseSaved} /> : null}
          <div className="flex flex-col">
            <InboxFromField accounts={accounts} value={from} onChange={onFromChange} />
            <InboxRecipientField label="To" {...to} />
            {showMore ? (
              <>
                <InboxRecipientField label="Cc" {...cc} />
                <InboxRecipientField label="Bcc" {...bcc} />
              </>
            ) : (
              <Button variant="ghost" size="sm" className="self-start" onClick={() => setMore(true)}>Cc, Bcc</Button>
            )}
          </div>
          <Input aria-label="Subject" placeholder="Subject" value={subject} onChange={(event) => onSubjectChange(event.target.value)} />
          <Textarea aria-label="Message" value={text} onChange={(event) => onTextChange(event.target.value)} className="min-h-40" />
          {attachments.length > 0 || onAttach ? (
            <div className="flex flex-wrap items-center gap-2">
              {attachments.map(({ id, name }) => <InboxPill key={id} label={name} onRemove={onRemoveAttachment && (() => onRemoveAttachment(id))} />)}
              {onAttach ? <Button variant="ghost" size="icon" aria-label="Attach a file" onClick={onAttach}><Paperclip /></Button> : null}
            </div>
          ) : null}
          <InboxDraftStatus keeping={keeping} gmail={gmail} sent={sent} onRetry={onKeepAgain} />
        </>
      )}
    </Screen>
  );
}
