import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "../Button.tsx";
import { ListGroup } from "../ListGroup.tsx";
import { Screen } from "../Screen.tsx";
import { Skeleton } from "../Skeleton.tsx";
import { InboxAttachmentRow, type InboxAttachmentRowProps } from "./InboxAttachmentRow.tsx";
import { InboxMessageActions, type InboxMessageActionsProps } from "./InboxMessageActions.tsx";
import { InboxMessageFault, type InboxMessageFaultProps } from "./InboxMessageFault.tsx";
import { InboxMessageHeader, type InboxMessageHeaderProps } from "./InboxMessageHeader.tsx";
import { InboxNotice, type InboxNoticeKind } from "./InboxNotice.tsx";
import { InboxThreadNav, type InboxThreadNavProps } from "./InboxThreadNav.tsx";

export type InboxMessageScreenProps = InboxMessageHeaderProps &
  InboxMessageActionsProps &
  InboxThreadNavProps & {
    /** The subject line, which is the screen's one title. */
    subject: string;
    /** Goes back to the list. */
    onClose: () => void;
    /** The body is being read from Gmail: placeholders stand in for it. */
    reading?: boolean;
    /** Why the body could not be read; shown in place of it. */
    fault?: InboxMessageFaultProps["kind"];
    /** Does what the fault allows: try again, reopen, or open in Gmail. */
    onFaultAction?: () => void;
    /** The message is the copy saved on the phone while access is checked: it offers no images, links or attachments. */
    fromPhone?: boolean;
    /** Remote images are hidden. */
    imagesHidden?: boolean;
    /** Loads the remote images of this message; offered only on a message loaded from Gmail with images off. */
    onShowImages?: () => void;
    /** Something to tell about marking or acting on the message. */
    notice?: InboxNoticeKind;
    /** Does the one thing the notice offers. */
    onNoticeAction?: () => void;
    /** The attachments, each opened or saved only after its review. */
    attachments?: (InboxAttachmentRowProps & { id: string })[];
    /** The body, rendered by the shell with nothing in it able to run or to fetch on its own. */
    children?: ReactNode;
  };

/**
 * One message with its thread: who it is from, its body or why it could not be read, its attachments, and what can be
 * done with it. Images, links and attachments wait for the owner.
 *
 * @model spec/app/inbox/message.md
 */
export function InboxMessageScreen({
  subject, onClose, sender, address, to, cc, replyTo, date, place, count, onOlder, onNewer, reading = false, fault, onFaultAction, fromPhone = false,
  imagesHidden = false, onShowImages, notice, onNoticeAction, attachments = [], children, ...actions
}: InboxMessageScreenProps) {
  const body = reading ? (
    <div role="status" aria-label="Loading message" className="flex flex-col gap-3 py-2"><Skeleton /><Skeleton /><Skeleton className="w-3/4" /></div>
  ) : fault ? (
    <InboxMessageFault kind={fault} onAction={onFaultAction} />
  ) : (
    <>
      {fromPhone ? <InboxNotice kind="savedMessage" /> : null}
      {imagesHidden && onShowImages ? <InboxNotice kind="imagesHidden" onAction={onShowImages} /> : null}
      <div className="text-base break-words">{children}</div>
      {attachments.length > 0 ? <ListGroup heading="Attachments">{attachments.map(({ id, ...file }) => <InboxAttachmentRow key={id} {...file} />)}</ListGroup> : null}
    </>
  );
  return (
    <Screen
      title={subject}
      titleControl={<span className="flex-1" />}
      leading={<Button variant="ghost" size="icon" aria-label="Back to the list" onClick={onClose}><ChevronLeft /></Button>}
      actions={reading || fault ? null : <InboxMessageActions {...actions} compact />}
    >
      <div className="flex flex-col gap-4 px-2">
        {count > 1 ? <InboxThreadNav place={place} count={count} onOlder={onOlder} onNewer={onNewer} /> : null}
        <InboxMessageHeader sender={sender} address={address} to={to} cc={cc} replyTo={replyTo} date={date} />
        <p aria-hidden="true" className="mt-1 font-display text-3xl font-light [overflow-wrap:anywhere]">{subject}</p>
        {notice ? <InboxNotice kind={notice} onAction={onNoticeAction} /> : null}
        {body}
      </div>
    </Screen>
  );
}
