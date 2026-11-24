import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { Button } from "../Button.tsx";
import { Sheet, SheetClose, SheetContent } from "../Sheet.tsx";

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
  /** The verified plain text and digest after a successful Open. */
  preview?: { readonly text: string; readonly digest: string };
  /** The save uses the browser's downloads, which do not report whether the file landed. */
  browserDownload?: boolean;
  /** Goes ahead with the use, once; offered only while the review waits and the account may still be read. */
  onConfirm?: () => void;
  /** Called when the sheet is dismissed or closed. */
  onClose: () => void;
};

const verbs = { open: { ask: "Open", done: "Opened", refused: "Could not open it" }, save: { ask: "Save", done: "Saved to Files", refused: "Could not save it" } } as const;

/**
 * An attachment shown before it is opened or saved: its name and size, then how the use ended, honestly, including
 * when a save may have happened and could not be confirmed.
 *
 * @model spec/app/inbox/message.md
 */
export function InboxAttachmentReview({ open, name, size, handling, outcome = "review", preview, browserDownload = false, onConfirm, onClose }: InboxAttachmentReviewProps) {
  const words = verbs[handling];
  const ended = outcome !== "review" && outcome !== "working";
  const opened = outcome === "done" && handling === "open" ? preview : undefined;
  const unknown = handling === "open" ? "Not sure it opened." : browserDownload ? "Save not confirmed. Check your downloads." : "Not sure it was saved. Look in Files.";
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent
        title={opened ? name : `${words.ask} this file?`}
        actions={
          <>
            <SheetClose asChild><Button variant="secondary">{ended ? "Close" : "Cancel"}</Button></SheetClose>
            {!ended ? <Button loading={outcome === "working"} disabled={!onConfirm} onClick={onConfirm}>{words.ask}</Button> : null}
          </>
        }
      >
        {opened ? null : <p className="text-base font-medium [overflow-wrap:anywhere]">{name}</p>}
        <p className="text-sm text-muted-foreground">{size}</p>
        {opened ? (
          <>
            <details className="mt-3 break-all text-sm text-muted-foreground"><summary className="min-h-11 cursor-pointer content-center">Details</summary>SHA-256 {opened.digest}</details>
            <section aria-label="Attachment contents" className="mt-3"><pre className="whitespace-pre-wrap [overflow-wrap:anywhere] font-mono text-sm">{opened.text}</pre></section>
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
