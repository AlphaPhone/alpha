// spec/app/files/scan.md, "Story: Arrange the pages"; spec/app/files/scan.md, "Story: Keep the scan as I work"; spec/app/files/scan.md, "Story: Make the PDF, and keep the photo"
import { Alert, Button, Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger, DialogClose, cn, focusRing } from "@repo/ui";
import type { Layer } from "effect";
import { ArrowDown, Camera, Crop, FileDown, ImagePlus, Save, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useMachine as useCorrection } from "../../gen/app__files__correction.react.ts";
import { useMachine } from "../../gen/app__files__scan.react.ts";
import { pageLimit } from "../../gen/app__files__scanDraft.ts";
import type { Event } from "../../gen/app__files__scan.ts";
import type { Resident, Shown } from "../runtime/area.tsx";
import { ScanCorrection } from "./ScanCorrection.tsx";
import { ScanAssets, addScanImage, editScanLine, exportScan, type scan } from "./scan.vibe";

type Runtime = Layer.Success<typeof scan> | Resident;

function PickPage({ capture, children, replacing, selected, label }: {
  capture: boolean;
  children: ReactNode;
  replacing: number;
  selected(file: File, replacing: number, camera: boolean): void;
  label: string;
}) {
  return (
    <label className={cn("relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-secondary px-4 text-sm font-semibold text-secondary-foreground focus-within:outline-ring", focusRing)}>
      {children}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture={capture ? "environment" : undefined}
        aria-label={label}
        className="absolute inset-0 m-0 size-full cursor-pointer opacity-0"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) selected(file, replacing, capture);
        }}
      />
    </label>
  );
}

/** Arrange the images of a scanned document before saving the draft, the PDF or a photo. @model spec/app/files/scan.md */
export function Scan({ runtime }: Shown<Runtime>) {
  const { state, can, send } = useMachine(runtime);
  const correction = useCorrection(runtime);
  if (!state?.open) return null;
  const allowed = (event: Event) => can(event, "Owner");
  const fire = (event: Event) => { if (allowed(event)) void send(event, "Owner"); };
  const selected = (image: File, replacing: number, camera: boolean) => {
    void runtime.runPromiseExit(addScanImage(image, replacing, camera));
  };
  const review = state.keeping.overwrite.showing;
  const ready = can({ type: "add", frame: state.images + 1, replacing: 0, camera: false }, "Phone");
  const canExport = allowed({ type: "exportPdf" });
  const searchable = state.pages.every((page) => page.text !== 0) && state.pages.some((page) => !page.blank);
  const links = state.text.links.showing
    ? runtime.runSync(ScanAssets.use((assets) => assets.words(state.text.linksOf.image, state.text.linksOf.edits)))?.links ?? []
    : [];
  const busy = state.pdf.outcome === "Recorded" || state.pdf.outcome === "Sent";
  return (
    <>
    <Dialog open onOpenChange={(open) => { if (!open) fire({ type: "close" }); }}>
      <DialogContent aria-describedby={undefined} closeLabel="Close document" className="flex max-h-[min(90dvh,46rem)] flex-col overflow-y-auto">
        <DialogTitle>Scan document</DialogTitle>
        {state.keeping.broken && <Alert variant="destructive">The saved draft could not be read.</Alert>}
        {allowed({ type: "resume" }) && (
          <div className="flex items-center justify-between rounded-tile bg-secondary p-3">
            <span>{review ? "Replace these pages with the saved draft?" : "Saved draft"}</span>
            <Button size="sm" onClick={() => fire({ type: "resume" })}>Resume draft</Button>
          </div>
        )}
        {allowed({ type: "askToResume" }) && <Button variant="secondary" size="sm" onClick={() => fire({ type: "askToResume" })}>Load saved draft</Button>}
        {allowed({ type: "takeTheirs" }) && <Button variant="secondary" size="sm" onClick={() => fire({ type: "takeTheirs" })}>Read saved draft</Button>}
        {allowed({ type: "keepMine" }) && <Button variant="secondary" size="sm" onClick={() => fire({ type: "keepMine" })}>Keep my pages</Button>}
        {ready && (
          <div className="flex flex-wrap gap-2">
            <PickPage capture replacing={0} selected={selected} label="Capture new page"><Camera className="size-4" aria-hidden />Capture page</PickPage>
            <PickPage capture={false} replacing={0} selected={selected} label="Add page"><ImagePlus className="size-4" aria-hidden />Add image</PickPage>
          </div>
        )}
        {state.pages.length === 0 ? <p className="py-6 text-center text-muted-foreground">No pages yet</p> : (
          <ol className="space-y-2" aria-label={`${state.pages.length} of ${pageLimit} scanned pages`}>
            {state.pages.map(({ image, text, blank, edits }, at) => {
              const page = runtime.runSync(ScanAssets.use((assets) => assets.read(image)));
              const words = text === 0 ? undefined : runtime.runSync(ScanAssets.use((assets) => assets.words(image, edits)));
              const begin = { type: "begin", image } as const;
              const read = { type: "recognize", image } as const;
              const reading = state.text.reading.status === "Loading" && state.text.read === image;
              const replace = can({ type: "add", frame: state.images + 1, replacing: image, camera: true }, "Phone");
              const number = at + 1;
              return (
                <li key={image} className="grid gap-2 rounded-tile bg-card p-3">
                  <p className="font-semibold">Page {number}</p>
                  {page && <img src={page.uri} alt={`Document page ${number}`} className="max-h-32 w-full object-contain" loading="lazy" />}
                  <div className="flex flex-wrap gap-2">
                    {replace && correction.can(begin, "Owner") && <Button variant="secondary" size="sm" aria-label={`Correct page ${number}`} onClick={() => void correction.send(begin, "Owner")}><Crop />Correct</Button>}
                    {replace && <PickPage capture replacing={image} selected={selected} label={`Retake page ${number}`}><Camera className="size-4" aria-hidden />Retake</PickPage>}
                    {replace && <PickPage capture={false} replacing={image} selected={selected} label={`Replace page ${number}`}><ImagePlus className="size-4" aria-hidden />Replace</PickPage>}
                    {allowed({ type: "moveToEnd", image }) && at < state.pages.length - 1 && <Button variant="secondary" size="sm" aria-label={`Move page ${number} to end`} onClick={() => fire({ type: "moveToEnd", image })}><ArrowDown /></Button>}
                    {allowed({ type: "remove", image }) && <Button variant="ghost" size="icon" aria-label={`Remove page ${number}`} onClick={() => fire({ type: "remove", image })}><Trash2 /></Button>}
                    {allowed({ type: "keepPhoto", image }) && <Button variant="secondary" size="sm" onClick={() => fire({ type: "keepPhoto", image })}><Save />Keep photo</Button>}
                    {allowed(read) && <Button variant="secondary" size="sm" loading={reading} onClick={() => fire(read)}>Read text</Button>}
                    {allowed({ type: "copyText", image }) && <Button variant="secondary" size="sm" onClick={() => fire({ type: "copyText", image })}>Copy text</Button>}
                    {allowed({ type: "reviewLinks", image }) && <Button variant="secondary" size="sm" onClick={() => fire({ type: "reviewLinks", image })}>Review links</Button>}
                  </div>
                  {blank && <p className="text-sm text-muted-foreground">No text found</p>}
                  {!blank && words !== undefined && (
                    <details>
                      <summary className="font-semibold">Review page text</summary>
                      {words.lines.length === 0 ? <p className="whitespace-pre-wrap">{words.text}</p> : words.lines.map((line, index) => (
                        <label key={index} className="mb-1 block">
                          <span className="sr-only">Line {index + 1}</span>
                          <input defaultValue={line.text} className="w-full rounded-sm border border-input bg-background p-2 text-sm" maxLength={2_000}
                            onBlur={(event) => void runtime.runPromiseExit(editScanLine(image, index, event.currentTarget.value))} />
                        </label>
                      ))}
                    </details>
                  )}
                  {state.text.reading.status === "Failed" && state.text.read === image && <Alert variant="destructive">Text could not be read.</Alert>}
                </li>
              );
            })}
          </ol>
        )}
        {state.problem !== "NoProblem" && <Alert variant="destructive">{state.problem === "TooLarge" ? "This document is too large to save." : "The PDF could not be prepared."}</Alert>}
        {state.pdf.outcome === "Refused" && <Alert variant="destructive">The PDF was not saved.</Alert>}
        {state.pdf.outcome === "Uncertain" && <Alert variant="destructive">Saving the PDF could not be confirmed.</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          {allowed({ type: "discardDraft" }) && (
            <Dialog>
              <DialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 />Delete draft</Button></DialogTrigger>
              <DialogContent>
                <DialogTitle>Delete this draft?</DialogTitle>
                <DialogDescription>The pages in this draft will be removed.</DialogDescription>
                <div className="flex justify-end gap-2">
                  <DialogClose asChild><Button variant="secondary" size="sm">Cancel</Button></DialogClose>
                  <DialogClose asChild><Button variant="destructive" size="sm" onClick={() => fire({ type: "discardDraft" })}>Delete draft</Button></DialogClose>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {(canExport || busy) && <Button size="sm" loading={busy} onClick={() => void runtime.runPromiseExit(exportScan(false))}><FileDown />Save PDF</Button>}
          {canExport && searchable && <Button variant="secondary" size="sm" onClick={() => void runtime.runPromiseExit(exportScan(true))}>Searchable PDF</Button>}
        </div>
      </DialogContent>
    </Dialog>
    <ScanCorrection runtime={runtime} />
    <Dialog open={state.text.links.showing} onOpenChange={(open) => { if (!open) fire({ type: "closeLinks" }); }}>
      <DialogContent aria-describedby={undefined} closeLabel="Close links">
        <DialogTitle>Scanned links</DialogTitle>
        {links.length === 0 && <p>No links found</p>}
        {links.map((url, index) => (
          <Button key={url} variant="ghost" className="max-w-full justify-start whitespace-normal break-all" disabled={!allowed({ type: "openLink", link: index + 1 })} onClick={() => fire({ type: "openLink", link: index + 1 })}>{url}</Button>
        ))}
      </DialogContent>
    </Dialog>
    </>
  );
}
