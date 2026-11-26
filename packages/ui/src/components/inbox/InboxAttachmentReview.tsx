import { ChevronLeft, ChevronRight, CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { Button } from "../Button.tsx";
import { Sheet, SheetClose, SheetContent } from "../Sheet.tsx";

export type InboxAttachmentPreview = { readonly digest: string } & (
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "image"; readonly url: string }
  | {
      readonly kind: "pdf";
      readonly page: number;
      readonly pages: number;
      readonly drawing: { readonly kind: "loading" } | { readonly kind: "failed"; readonly onRetry?: () => void } | { readonly kind: "rendered"; readonly url: string };
      readonly onPrevious?: () => void;
      readonly onNext?: () => void;
    }
);

export type InboxAttachmentReviewProps = {
  /** Whether the review is up; the parent keeps it. */
  open: boolean;
  /** The file's name. */
  name: string;
  /** Its size, already worded. */
  size: string;
  /** Whether it is to be opened or saved to Files. */
  handling: "open" | "save";
  /** Where the use stands: waiting for the owner, under way, done, refused, or ended with no way to know whether it happened. */
  outcome?: "review" | "working" | "done" | "refused" | "unknown";
  /** The verified text or a raster derived from the reviewed attachment. */
  preview?: InboxAttachmentPreview;
  /** The save uses the browser's downloads, which do not report whether the file landed. */
  browserDownload?: boolean;
  /** The save goes through Android's picker, where the owner names the copy. */
  picker?: boolean;
  /** Goes ahead with the use, once; offered only while the review waits and the account may still be read. */
  onConfirm?: () => void;
  /** Saves the file from a review for opening, before or after it opens; left out while that is not allowed. */
  onSave?: () => void;
  /** Where that save stands, once asked. */
  saveOutcome?: "working" | "done" | "refused" | "unknown";
  /** Called when the sheet is dismissed or closed. */
  onClose: () => void;
};

const verbs = { open: { ask: "Open", done: "Opened", refused: "Could not open it" }, save: { ask: "Save", done: "Saved to Files", refused: "Could not save it" } } as const;
const pickerSave = { ask: "Save as…", done: "Saved.", unknown: "Couldn’t confirm the save. Check the chosen file before trying again." } as const;

function PdfPreview({ page, pages, drawing, onPrevious, onNext }: Extract<InboxAttachmentPreview, { kind: "pdf" }>) {
  const name = `Page ${page} of ${pages}`;
  return <>
    <div role="group" aria-label="PDF pages" className="mb-2 flex items-center justify-center gap-2">
      <Button variant="ghost" size="icon" aria-label="Previous page" disabled={!onPrevious} onClick={onPrevious}><ChevronLeft /></Button>
      <span className="text-sm tabular-nums" aria-live="polite">{name}</span>
      <Button variant="ghost" size="icon" aria-label="Next page" disabled={!onNext} onClick={onNext}><ChevronRight /></Button>
    </div>
    {drawing.kind === "rendered" ? <img src={drawing.url} alt={name} decoding="async" className="mx-auto block h-auto max-w-full rounded-md bg-alpha-foreground ring-1 ring-border" />
      : drawing.kind === "loading" ? <p role="status" className="text-center text-sm text-muted-foreground">Loading page…</p>
        : <div className="flex items-center justify-between gap-2"><p role="alert" className="text-sm">This page could not be opened.</p>{drawing.onRetry ? <Button variant="secondary" onClick={drawing.onRetry}>Retry</Button> : null}</div>}
  </>;
}

/**
 * An attachment shown before it is opened or saved: its name and size, then how the use ended, honestly, including
 * when a save may have happened and could not be confirmed. A review for opening also saves the file, before or after
 * it opens, as live v119 did beside Back and Open.
 *
 * @model spec/app/inbox/message.md
 */
export function InboxAttachmentReview({ open, name, size, handling, outcome = "review", preview, browserDownload = false, picker = false, onConfirm, onSave, saveOutcome, onClose }: InboxAttachmentReviewProps) {
  const save = picker ? { ...verbs.save, ask: pickerSave.ask, done: pickerSave.done } : verbs.save;
  const words = handling === "open" ? verbs.open : save;
  const ended = outcome !== "review" && outcome !== "working";
  const opened = outcome === "done" && handling === "open" ? preview : undefined;
  const saveUnknown = browserDownload ? "Save not confirmed. Check your downloads." : picker ? pickerSave.unknown : "Not sure it was saved. Look in Files.";
  const unknown = handling === "open" ? "Not sure it opened." : saveUnknown;
  const saving = handling === "open" && (onSave !== undefined || saveOutcome !== undefined);
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent
        title={opened ? name : `${verbs[handling].ask} this file?`}
        actions={
          <>
            <SheetClose asChild><Button variant="secondary">{ended ? "Close" : "Cancel"}</Button></SheetClose>
            {saving ? <Button variant={ended ? "primary" : "secondary"} loading={saveOutcome === "working"} disabled={!onSave} onClick={onSave}>{save.ask}</Button> : null}
            {!ended ? <Button loading={outcome === "working"} disabled={!onConfirm} onClick={onConfirm}>{words.ask}</Button> : null}
          </>
        }
      >
        {handling === "open" && saveOutcome === "working" ? <p role="status" className="mb-3 text-sm text-muted-foreground">Saving…</p> : null}
        {handling === "open" && saveOutcome === "done" ? <p role="status" className="mb-3 flex items-center gap-2 text-sm"><CircleCheck aria-hidden className="size-5 text-ok" />{save.done}</p> : null}
        {handling === "open" && saveOutcome === "refused" ? <p role="alert" className="mb-3 flex items-center gap-2 text-sm"><CircleAlert aria-hidden className="size-5 text-destructive" />{save.refused}</p> : null}
        {handling === "open" && saveOutcome === "unknown" ? (
          <p role="alert" className="mb-3 flex items-center gap-2 text-sm"><TriangleAlert aria-hidden className="size-5 shrink-0 text-warn" />{saveUnknown}</p>
        ) : null}
        {opened ? null : <p className="text-base font-medium [overflow-wrap:anywhere]">{name}</p>}
        <p className="text-sm text-muted-foreground">{size}</p>
        {opened ? (
          <>
            <details className="mt-3 break-all text-sm text-muted-foreground"><summary className="min-h-11 cursor-pointer content-center">Details</summary>SHA-256 {opened.digest}</details>
            <section aria-label="Attachment contents" className="mt-3">
              {opened.kind === "text" ? <pre className="whitespace-pre-wrap [overflow-wrap:anywhere] font-mono text-sm">{opened.text}</pre>
                : opened.kind === "pdf" ? <PdfPreview {...opened} /> : <img src={opened.url} alt={name} className="max-h-[60dvh] max-w-full object-contain" />}
            </section>
          </>
        ) : outcome === "done" ? <p role="status" className="mt-4 flex items-center gap-2 text-sm"><CircleCheck aria-hidden className="size-5 text-ok" />{words.done}</p> : null}
        {outcome === "refused" ? <p role="alert" className="mt-4 flex items-center gap-2 text-sm"><CircleAlert aria-hidden className="size-5 text-destructive" />{words.refused}</p> : null}
        {outcome === "unknown" ? (
          <p role="alert" className="mt-4 flex items-center gap-2 text-sm"><TriangleAlert aria-hidden className="size-5 shrink-0 text-warn" />{unknown}</p>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
