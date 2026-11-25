import type { ReactNode } from "react";
import { ChevronLeft, Image } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { Screen } from "../Screen.tsx";
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
    <p role="status" aria-busy="true" className="mt-5.5 text-body text-muted-foreground">Loading…</p>
  ) : fault ? (
    <InboxMessageFault kind={fault} onAction={onFaultAction} />
  ) : (
    <>
      {imagesHidden && onShowImages ? (
        <p className="mt-4 mb-2">
          <button type="button" aria-label="Show images" onClick={onShowImages} className={cn(focusRing, "inline-flex min-h-11 items-center gap-1.5 rounded-full bg-secondary px-3.5 text-meta text-primary")}><Image aria-hidden className="size-4" />Show</button>
        </p>
      ) : null}
      <div className="mt-5.5 text-body [overflow-wrap:anywhere]">{children}</div>
      {attachments.length > 0 ? (
        <div className="mt-5.5 flex flex-col items-start gap-2">{attachments.map(({ id, ...file }) => <InboxAttachmentRow key={id} {...file} />)}</div>
      ) : null}
    </>
  );
  return (
    <Screen
      title={subject}
      titleControl={<span className="flex-1" />}
      leading={<Button variant="ghost" size="icon" aria-label="Back to the list" onClick={onClose}><ChevronLeft /></Button>}
      actions={reading || fault ? null : <InboxMessageActions {...actions} compact />}
      className="motion-safe:animate-rise [&_main>div]:gap-0"
    >
      {fromPhone ? <p role="status" className="-mt-1 px-2 pb-2 text-xs text-muted-foreground">Saved copy · Links and attachments are off</p> : null}
      <div className="flex flex-col px-2">
        {count > 1 ? <InboxThreadNav place={place} count={count} onOlder={onOlder} onNewer={onNewer} /> : null}
        <InboxMessageHeader sender={sender} address={address} to={to} cc={cc} replyTo={replyTo} date={date} />
        <p aria-hidden="true" className="mt-5 font-display text-3xl font-light [overflow-wrap:anywhere]">{subject}</p>
        {notice ? <div className="mt-4"><InboxNotice kind={notice} onAction={onNoticeAction} /></div> : null}
        {body}
      </div>
    </Screen>
  );
}
