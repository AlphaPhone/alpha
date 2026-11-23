// spec/camera/scanDialogs.md, "Story: Review the text I scanned before anything is saved"; spec/camera/scanDialogs.md, "Story: Make a searchable PDF of the pages I reviewed"; spec/camera/scan.md, "Story: Assemble a document and keep a draft I can reload"; spec/camera/scanDialogs.md, "Story: Correct a page's perspective before it replaces the page"; spec/camera/scanDialogs.md, "Story: Capture a document page with Camera"
import type { Effect } from "effect";
import { ArrowDown, ArrowUp, Copy, FileDown, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Dialogs, Event as DialogEvent } from "../../../gen/camera__scanDialogs.ts";
import type { Event as ScanEvent, Scan } from "../../../gen/camera__scan.ts";
import type { Scanner } from "../../camera/scanner.vibe";
import { scannedLinks, type TextLine } from "../../camera/scanText.ts";
import { Button, Dialog, DialogContent, DialogTitle, Textarea } from "../components/ui/index.ts";
import { cn, focusRing } from "../lib/cn.ts";

/** The scan dialogs' state, what may be done now, and the scanner that does it. */
export interface ScanReviewProps {
  /** The dialogs as the scan dialogs Machine keeps them. */
  dialogs: Dialogs;
  /** The open document as the scan Machine keeps it. */
  scan: Scan;
  /** Whether a dialog event is allowed now. */
  can: (event: DialogEvent) => boolean;
  /** Whether a document event is allowed now. */
  canScan: (event: ScanEvent) => boolean;
  /** The recognised lines of each page while the searchable review is open. */
  searchLines: readonly (readonly TextLine[])[];
  /** Run one of the scanner's controls. */
  scanner: (use: (s: Scanner.Shape) => Effect.Effect<unknown>) => void;
}

/**
 * The scan dialogs over Camera: text review, document, searchable review, correction and page capture.
 * @model spec/camera/scanDialogs.md
 */
export function ScanReview({ dialogs, scan, can, canScan, searchLines, scanner }: ScanReviewProps) {
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const [corners, setCorners] = useState<{ x: number; y: number }[] | undefined>(undefined);
  const [replacing, setReplacing] = useState(false);
  const text = dialogs.text;
  const searchable = dialogs.searchable;
  const body = draft ?? text.body;
  const links = scannedLinks(text.body);
  return (
    <>
      <Dialog open={text.shown} onOpenChange={(open) => { if (!open) { setDraft(undefined); scanner((s) => s.back()); } }}>
        <DialogContent closeLabel="Close scan">
          <DialogTitle>Scan text</DialogTitle>
          {text.image !== "" && <img src={text.image} alt="Captured page" className="max-h-40 w-full rounded-md bg-muted object-contain" />}
          <p role="status" aria-label="Scan status" className="text-sm text-muted-foreground">
            {text.ocr === "OcrStarting" ? "Reading text…" : text.ocr === "OcrFailed" ? "Scan failed" : text.note === "NoteSaved" ? "Saved to Notes." : text.note === "NoteUnconfirmed" ? "Save unconfirmed" : body === "" ? "No text" : "On device"}
          </p>
          <Textarea aria-label="Scanned text" rows={9} maxLength={100_000} value={body} disabled={!can({ type: "editText", body })}
            onChange={(event) => setDraft(event.target.value)} onBlur={() => { if (draft !== undefined) scanner((s) => s.editText(draft)); }} />
          {links.length > 0 && (
            <ul aria-label="Links in this scan" className="flex flex-col gap-1 text-sm">
              {links.map((url) => (
                <li key={url}><button type="button" className={cn("text-primary underline", focusRing)} onClick={() => scanner((s) => s.openLink(url))}>{url}</button></li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => scanner((s) => s.openDocument())}>Multi-page</Button>
            {can({ type: "keepPhoto" }) && scan.keep.source === "UnsavedFrame" && <Button variant="secondary" size="sm" onClick={() => scanner((s) => s.keepPhoto())}>{text.keepRetries > 0 ? "Try keeping again" : "Keep photo"}</Button>}
            {text.keep === "PhotoKept" && <span className="font-mono text-xs uppercase">Photo kept</span>}
            <Button variant="secondary" size="sm" disabled={!can({ type: "exportPhotoPdf" })} onClick={() => scanner((s) => s.exportPhotoPdf())}><FileDown />Photo PDF</Button>
            <Button variant="secondary" size="sm" aria-label="Copy text" disabled={body.trim() === ""} onClick={() => scanner((s) => s.copyText())}><Copy /></Button>
            {can({ type: "offerEvent", revision: text.textRevision }) && <Button variant="secondary" size="sm" onClick={() => scanner((s) => s.offerEvent())}>Add event</Button>}
            {can({ type: "tickRepeat" }) && (
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={text.repeatTicked} onChange={() => scanner((s) => s.tickRepeat())} />Repeats</label>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setDraft(undefined); scanner((s) => s.closeText()); }}>{text.ocr === "OcrStarting" ? "Cancel scan" : "Close scan"}</Button>
            <Button disabled={!can({ type: "saveToNotes" }) || draft !== undefined} onClick={() => scanner((s) => s.saveToNotes())}>{text.note === "NoteSaved" ? "Saved" : "Save to Notes"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogs.document} onOpenChange={(open) => { if (!open) scanner((s) => s.closeDocument()); }}>
        <DialogContent closeLabel="Close document">
          <DialogTitle>Review scan document</DialogTitle>
          <ol className="flex flex-col gap-2" aria-label="Pages">
            {scan.pageIds.map((url, index) => (
              <li key={url} className="flex items-center gap-2">
                <img src={url} alt={`Page ${index + 1}`} className="h-20 w-16 rounded-sm bg-muted object-cover" />
                <span className="flex-1 font-mono text-xs uppercase">Page {index + 1}</span>
                <Button variant="ghost" size="icon" aria-label={`Move page ${index + 1} up`} disabled={index === 0 || !canScan({ type: "beginEdit" })} onClick={() => scanner((s) => s.movePage(index, -1))}><ArrowUp /></Button>
                <Button variant="ghost" size="icon" aria-label={`Move page ${index + 1} down`} disabled={index === scan.pageIds.length - 1 || !canScan({ type: "beginEdit" })} onClick={() => scanner((s) => s.movePage(index, 1))}><ArrowDown /></Button>
                <Button variant="ghost" size="sm" disabled={!can({ type: "openCorrection" })} onClick={() => scanner((s) => s.openCorrection(index))}>Correct</Button>
                <Button variant="ghost" size="icon" aria-label={`Remove page ${index + 1}`} disabled={!canScan({ type: "beginEdit" })} onClick={() => scanner((s) => s.removePage(index))}><Trash2 /></Button>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" disabled={!canScan({ type: "beginEdit" })} onClick={() => scanner((s) => s.addPage("picker"))}>Add image</Button>
            <Button variant="secondary" size="sm" disabled={!can({ type: "openCapture" })} onClick={() => scanner((s) => s.openCapture())}>Capture page</Button>
            <Button variant="secondary" size="sm" disabled={!canScan({ type: "beginDraftAction" })} onClick={() => scanner((s) => s.saveDraft())}>Save draft</Button>
            <Button variant="secondary" size="sm" disabled={!canScan({ type: "beginDraftAction" })} onClick={() => (scan.pages.count === 0 ? scanner((s) => s.loadDraft(true)) : setReplacing(true))}>Load draft</Button>
            {scan.draftOwner !== "NoDraft" && <Button variant="ghost" size="sm" onClick={() => scanner((s) => s.deleteDraft())}>Delete draft</Button>}
          </div>
          <p role="status" className="text-sm text-muted-foreground">
            {scan.exportResult === "ExportConfirmed" ? "Exported" : scan.exportResult === "ExportUnknown" ? "Export unconfirmed" : scan.flight === "ExportingPages" ? "Preparing PDF…" : ""}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={!canScan({ type: "beginExport" })} onClick={() => scanner((s) => s.exportDocument(true))}>Searchable PDF</Button>
            <Button disabled={!canScan({ type: "beginExport" })} onClick={() => scanner((s) => s.exportDocument(false))}>Save PDF</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={replacing} onOpenChange={setReplacing}>
        <DialogContent closeLabel="Keep the open pages">
          <DialogTitle>Replace the open pages?</DialogTitle>
          <p className="text-sm text-muted-foreground">The saved draft replaces the pages open now.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setReplacing(false)}>Keep pages</Button>
            <Button onClick={() => { setReplacing(false); scanner((s) => s.loadDraft(true)); }}>Replace</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={searchable.shown} onOpenChange={(open) => { if (!open) scanner((s) => s.closeSearchable()); }}>
        <DialogContent closeLabel="Cancel searchable PDF" aria-label="Review searchable PDF">
          <DialogTitle>Review text</DialogTitle>
          <span className="w-fit rounded-full bg-secondary px-3 py-0.5 font-mono text-xs uppercase">On device</span>
          <p role="status" className="text-sm text-muted-foreground">
            {!searchable.ready ? "Reading text…" : searchable.busy ? "Preparing searchable PDF…" : ""}
          </p>
          {searchable.ready && (
            <div role="region" aria-label="Review details" tabIndex={0} className={cn("flex max-h-[50dvh] flex-col gap-3 overflow-y-auto", focusRing)}>
              {searchLines.map((lines, page) => (
                <section key={page} className="flex flex-col gap-2">
                  <h3 className="font-mono text-xs uppercase">Page {page + 1}</h3>
                  {lines.length === 0 && <p className="text-sm text-muted-foreground">No text</p>}
                  {lines.map((line, at) => (
                    <Textarea key={at} aria-label={`Page ${page + 1} line ${at + 1}`} rows={2} maxLength={4000} defaultValue={line.text} disabled={searchable.busy}
                      onBlur={(event) => scanner((s) => s.editSearchLine(page, at, event.target.value))} />
                  ))}
                </section>
              ))}
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" aria-label="Keep reviewed text" disabled={!can({ type: "keepText" })} onClick={() => scanner((s) => s.keepSearchableText())}>Keep text</Button>
            <Button aria-label="Save reviewed searchable PDF" loading={searchable.busy} disabled={!can({ type: "download" })} onClick={() => scanner((s) => s.downloadSearchable())}>Save PDF</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogs.correction.shown} onOpenChange={(open) => { if (!open) { setCorners(undefined); scanner((s) => s.closeCorrection()); } }}>
        <DialogContent closeLabel="Close correction">
          <DialogTitle>Correct page</DialogTitle>
          <div className="relative aspect-[3/4] w-full rounded-md bg-muted" aria-label="Page corners">
            {(corners ?? [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]).map((point, corner) => (
              <button key={corner} type="button" aria-label={`Corner ${corner + 1}`} disabled={!can({ type: "moveCorner" })}
                style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
                className={cn("absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background", focusRing)}
                onKeyDown={(event) => {
                  const step = { ArrowLeft: [-0.02, 0], ArrowRight: [0.02, 0], ArrowUp: [0, -0.02], ArrowDown: [0, 0.02] }[event.key];
                  if (step === undefined) return;
                  event.preventDefault();
                  const next = (corners ?? [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]).map((p, at) => at === corner ? { x: Math.max(0, Math.min(1, p.x + step[0]!)), y: Math.max(0, Math.min(1, p.y + step[1]!)) } : p);
                  setCorners(next);
                  scanner((s) => s.moveCorner(corner, next[corner]!.x, next[corner]!.y));
                }} />
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" disabled={!can({ type: "beginWork", forPreview: false })} onClick={() => { setCorners(undefined); scanner((s) => s.detect()); }}>Detect edges</Button>
            <Button variant="secondary" disabled={!can({ type: "beginWork", forPreview: true })} onClick={() => scanner((s) => s.previewCorrection())}>Preview</Button>
            <Button disabled={!can({ type: "applyCorrection" })} onClick={() => { setCorners(undefined); scanner((s) => s.applyCorrection()); }}>Use corrected page</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogs.capture.shown} onOpenChange={(open) => { if (!open) scanner((s) => s.closeCapture()); }}>
        <DialogContent closeLabel="Close page capture">
          <DialogTitle>Capture page</DialogTitle>
          <p role="status" className="text-sm text-muted-foreground">
            {dialogs.capture.stream === "StreamEnded" ? "Camera stopped" : dialogs.capture.stream === "NoStream" ? "Start Camera before capturing a document page." : dialogs.capture.frame ? "Page captured" : ""}
          </p>
          <div className="flex justify-end gap-2">
            {can({ type: "retake" }) && <Button variant="secondary" onClick={() => scanner((s) => s.retake())}>Retake</Button>}
            {can({ type: "capturePage" }) && <Button variant="secondary" onClick={() => scanner((s) => s.capturePage())}>Capture</Button>}
            <Button disabled={!can({ type: "usePage" })} onClick={() => scanner((s) => s.usePage())}>Use page</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
