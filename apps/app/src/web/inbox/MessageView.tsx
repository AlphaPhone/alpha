// spec/inbox/reader.md, "Story: Read a message and its conversation"; spec/inbox/reader.md, "Story: Mark mail read or unread"; spec/inbox/reader.md, "Story: Open an attachment as the exact file that was sent"; spec/inbox/reader.md, "Story: Trust what a formatted email shows me"
import { Archive, Bot, ChevronLeft, ChevronRight, Forward, Image, Mail, MailOpen, Paperclip, Reply, ReplyAll, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { MailLink, MailPart, Reader } from "../../../gen/inbox__reader.ts";
import { canShowImages, formattedShown, imagesLoad, senderImageShown } from "../../../gen/inbox__reader.ts";
import { fitMailFrame, prepareMailHtml } from "../../inbox/html.ts";
import { senderImageFacts, senderImagePath } from "../../inbox/text.ts";
import { Avatar, Button, Dialog, DialogContent, DialogTitle, Sheet, SheetContent, Spinner } from "../components/ui/index.ts";
import { imagePlaceholder, readFailure } from "./messages.ts";

export type MessageViewProps = {
  /** The reader as its machine holds it. */
  reader: Reader;
  /** Whether read changes are allowed for this account now. */
  canMarkRead: boolean;
  /** Whether archive and Trash are allowed for this account now. */
  canChange: boolean;
  onBack: () => void;
  onReply: (mode: "ReplyMode" | "ReplyAllMode" | "ForwardMode") => void;
  onChange: (kind: "ArchiveKind" | "TrashKind" | "StarKind" | "UnstarKind") => void;
  onSetRead: (unread: boolean) => void;
  onShowImages: () => void;
  onPage: (next: boolean) => void;
  onAttachment: (part: MailPart) => void;
  onOpenAttachment: () => void;
  onSaveAttachment: () => void;
  onCloseAttachment: () => void;
  onLink: (link: MailLink) => void;
  /** Hands the message to the agent in the assistant's composer. */
  onAsk: () => void;
};

/** The formatted part of a message in a sandboxed frame, scaled to fit. */
function FormattedMail({ html, images }: { readonly html: string; readonly images: boolean }) {
  const prepared = useMemo(() => prepareMailHtml(html, images, imagePlaceholder), [html, images]);
  if (prepared === null) return null;
  return (
    <iframe
      title="Formatted email" sandbox="allow-same-origin" referrerPolicy="no-referrer" srcDoc={prepared.document}
      className="w-full border-0 bg-card" onLoad={(event) => { fitMailFrame(event.currentTarget); }}
    />
  );
}

/**
 * The open message: its sender, text or formatted part, links, attachments and conversation pages.
 * @model spec/inbox/reader.md
 */
export function MessageView({ reader, canMarkRead, canChange, onBack, onReply, onChange, onSetRead, onShowImages, onPage, onAttachment, onOpenAttachment, onSaveAttachment, onCloseAttachment, onLink, onAsk }: MessageViewProps) {
  const [linksOpen, setLinksOpen] = useState(false);
  const body = reader.body;
  const images = imagesLoad(reader);
  const facts = senderImageFacts(body.senderAddress);
  const senderImage = senderImageShown(reader.imagesPreferred, facts.sharedProvider, facts.validDomain, facts.brand !== "") ? senderImagePath(facts.brand) : undefined;
  const shown = reader.phase === "BodyShown";
  const htmlBytes = new TextEncoder().encode(body.html).length;
  const attachment = reader.attachment;
  return (
    <article aria-label={body.subject || "Message"} className="flex flex-col gap-3 pb-6">
      <header className="flex items-center gap-1 px-2">
        <Button size="icon" variant="ghost" aria-label="Back" onClick={onBack}><ChevronLeft aria-hidden /></Button>
        <div className="ml-auto flex items-center gap-1">
          <Button size="icon" variant="ghost" aria-label="Ask about this email" disabled={!shown || reader.saved || body.historyId === ""} onClick={onAsk}><Bot aria-hidden /></Button>
          <Button size="icon" variant="ghost" aria-label="Reply" disabled={!shown || reader.saved} onClick={() => onReply("ReplyMode")}><Reply aria-hidden /></Button>
          <Button size="icon" variant="ghost" aria-label="Reply all" disabled={!shown || reader.saved} onClick={() => onReply("ReplyAllMode")}><ReplyAll aria-hidden /></Button>
          <Button size="icon" variant="ghost" aria-label="Forward" disabled={!shown || reader.saved || body.historyId === ""} onClick={() => onReply("ForwardMode")}><Forward aria-hidden /></Button>
          <Button size="icon" variant="ghost" aria-label="Archive" disabled={!shown || !canChange || body.historyId === ""} onClick={() => onChange("ArchiveKind")}><Archive aria-hidden /></Button>
          <Button size="icon" variant="ghost" aria-label="Move to Trash" disabled={!shown || !canChange || body.historyId === ""} onClick={() => onChange("TrashKind")}><Trash2 aria-hidden /></Button>
          <Button size="icon" variant="ghost" aria-label={body.starred ? "Remove star" : "Star"} disabled={!shown || !canChange || body.historyId === ""} onClick={() => onChange(body.starred ? "UnstarKind" : "StarKind")}><Star aria-hidden className={body.starred ? "fill-current" : undefined} /></Button>
          <Button size="icon" variant="ghost" aria-label={body.unread ? "Mark read" : "Mark unread"} disabled={!shown || !canMarkRead || body.historyId === "" || reader.readChange === "ReadChanging"} onClick={() => onSetRead(!body.unread)}>
            {body.unread ? <MailOpen aria-hidden /> : <Mail aria-hidden />}
          </Button>
        </div>
      </header>
      <h2 className="px-4 font-serif text-2xl">{body.subject || "(no subject)"}</h2>
      <div className="flex items-center gap-3 px-4">
        <Avatar name={body.sender || body.senderAddress} src={senderImage} />
        <div className="min-w-0">
          <p className="truncate">{body.sender && body.senderAddress ? `${body.sender} <${body.senderAddress}>` : body.senderAddress || body.sender || "Sender address unavailable"}</p>
          {body.recipients.length > 0 && <p className="truncate text-sm text-muted-foreground">To {body.recipients.join(", ")}</p>}
        </div>
      </div>
      {reader.phase === "BodyLoading" && <div role="status" aria-label="Loading message" className="flex justify-center py-6"><Spinner /></div>}
      {reader.phase === "BodyFailed" && <p role="status" className="px-4 text-sm">{readFailure[reader.failure]}</p>}
      {reader.phase === "BodyNotSaved" && <p className="px-4 text-sm text-muted-foreground">Message not saved on this device.</p>}
      {shown && (
        formattedShown(htmlBytes) ? (
          <div className="flex flex-col gap-2">
            {canShowImages(reader) && !images && (
              <Button size="sm" variant="outline" className="mx-4 self-start" onClick={onShowImages}><Image aria-hidden />Show images</Button>
            )}
            <FormattedMail html={body.html} images={images} />
          </div>
        ) : (
          <p className="whitespace-pre-wrap px-4 font-legible">{body.text}</p>
        )
      )}
      {shown && body.parts.length > 0 && (
        <ul aria-label="Attachments" className="flex flex-col gap-1 px-4">
          {body.parts.map((part) => (
            <li key={part.partId}>
              <Button variant="outline" size="sm" disabled={attachment.phase === "AttachmentLoading"} onClick={() => onAttachment(part)}>
                <Paperclip aria-hidden />{part.name}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {shown && body.links.length > 0 && (
        <div className="px-4">
          <Button variant="ghost" size="sm" aria-expanded={linksOpen} onClick={() => setLinksOpen(!linksOpen)}>Other links</Button>
          {linksOpen && (
            <ul className="flex flex-col">
              {body.links.map((link) => (
                <li key={link.href}><button type="button" className="text-left text-sm text-primary underline" onClick={() => onLink(link)}>{link.text}</button></li>
              ))}
            </ul>
          )}
        </div>
      )}
      {reader.thread.threadId !== "" && reader.thread.total > 1 && (
        <nav aria-label="Conversation" className="flex items-center justify-between px-4">
          <Button size="icon" variant="ghost" aria-label="Earlier messages" disabled={reader.thread.previous.length === 0} onClick={() => onPage(false)}><ChevronLeft aria-hidden /></Button>
          <span className="font-mono text-xs uppercase text-muted-foreground">{reader.thread.offset + 1}–{reader.thread.offset + reader.thread.messages.length} / {reader.thread.total}</span>
          <Button size="icon" variant="ghost" aria-label="Later messages" disabled={reader.thread.following < 0} onClick={() => onPage(true)}><ChevronRight aria-hidden /></Button>
        </nav>
      )}
      <Sheet open={attachment.phase !== "NoAttachment"} onOpenChange={(open) => { if (!open) onCloseAttachment(); }}>
        <SheetContent side="bottom" title={attachment.name || "Attachment"}>
          {attachment.phase === "AttachmentLoading" ? (
            <div role="status" aria-label="Loading attachment" className="flex justify-center py-6"><Spinner /></div>
          ) : (
            <div className="flex flex-col gap-3 px-5 pb-5">
              <p className="font-mono text-xs uppercase text-muted-foreground">{attachment.mimeType} · {attachment.bytes} bytes · SHA-256 {attachment.sha256.slice(0, 12)}</p>
              {attachment.preview !== "" && <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-sm">{attachment.preview}</pre>}
              <div className="flex gap-2">
                {attachment.external && <Button onClick={onOpenAttachment}>Open</Button>}
                <Button variant="outline" disabled={attachment.save !== "SaveIdle" && attachment.save !== "SaveCancelled"} loading={attachment.save === "Saving"} onClick={onSaveAttachment}>Save</Button>
              </div>
              {attachment.save === "SavedCopy" && <p role="status">Saved.</p>}
              {attachment.save === "SaveUnconfirmed" && <p role="status">Couldn't confirm the save. Check the chosen file before trying again.</p>}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </article>
  );
}

export type LinkReviewDialogProps = {
  /** The link under review, or none. */
  review: { readonly href: string; readonly host: string; readonly mismatch: boolean; readonly text: string } | undefined;
  onOpen: () => void;
  onCancel: () => void;
};

/** Asks the owner before a mail link opens in Alpha's Browser, warning when its text names another host. */
export function LinkReviewDialog({ review, onOpen, onCancel }: LinkReviewDialogProps) {
  return (
    <Dialog open={review !== undefined} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent>
        <DialogTitle>Open this link in Browser?</DialogTitle>
        {review && (
          <div className="flex flex-col gap-3">
            <p className="font-semibold">{review.host}</p>
            <p className="break-all text-sm text-muted-foreground">{review.href}</p>
            {review.mismatch && <p role="alert" className="text-sm text-destructive">The email shows “{review.text}”, but the link goes to {review.host}.</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onCancel}>Cancel</Button>
              <Button onClick={onOpen}>Open link</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
