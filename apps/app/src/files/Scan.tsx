// spec/app/files/scan.md, "Story: Arrange the pages"; spec/app/files/scan.md, "Story: Keep the scan as I work"; spec/app/files/scan.md, "Story: Make the PDF, and keep the photo"; spec/app/files/scan.md, "The owner removes a page or moves it one place earlier or later"
import { Alert, Button, Input, Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger, DialogClose, cn, focusRing } from "@repo/ui";
import { Effect, type Layer } from "effect";
import { ArrowDown, ArrowUp, Camera, Crop, ImagePlus, Save, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useMachine as useCorrection } from "../../gen/app__files__correction.react.ts";
import { useMachine } from "../../gen/app__files__scan.react.ts";
import { pageLimit } from "../../gen/app__files__scanDraft.ts";
import type { Page } from "../../gen/app__files__scanDraft.ts";
import type { Event } from "../../gen/app__files__scan.ts";
import type { Resident, Shown } from "../runtime/area.tsx";
import { ScanCorrection } from "./ScanCorrection.tsx";
import { ScanSearchable } from "./ScanSearchable.tsx";
import { ScanAssets, addScanImage, editScanLine, noteContent, reviewCalendarEvent, type scan } from "./scan.vibe";

type Runtime = Layer.Success<typeof scan> | Resident;
const pageAction = "rounded-option [&_svg]:size-5";

function PickPage({ capture, children, replacing, selected, label, iconOnly = false }: {
  capture: boolean;
  children: ReactNode;
  replacing: number;
  selected: (file: File, replacing: number, camera: boolean) => void;
  label: string;
  iconOnly?: boolean;
}) {
  return (
    <label title={iconOnly ? label : undefined} className={cn(
      "relative inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 bg-secondary hover:bg-accent text-secondary-foreground focus-within:outline-ring",
      iconOnly ? cn("size-11", pageAction) : "flex-1 basis-36 rounded-full px-4 text-base font-semibold",
      focusRing,
    )}>
      {children}
      <Input
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

function NoteReview({ runtime, pages, save }: { runtime: Shown<Runtime>["runtime"]; pages: ReadonlyArray<Page>; save: () => void }) {
  const content = runtime.runSync(noteContent(pages));
  const allowed = content !== undefined && content.trim() !== "" && content.length <= 20_241;
  return (
    <DialogContent aria-describedby={undefined} closeLabel="Close note review" className="max-h-[86dvh] overflow-y-auto">
      <DialogTitle>Make note from scanned text</DialogTitle>
      {content !== undefined && content !== "" && <pre className="max-h-[55dvh] overflow-y-auto whitespace-pre-wrap break-words font-sans">{content}</pre>}
      {!allowed && <Alert variant="destructive">Shorten the reviewed text before making a note.</Alert>}
      <DialogClose asChild><Button disabled={!allowed} onClick={save}>Save note</Button></DialogClose>
    </DialogContent>
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
  const selectedImage = state.origin === "SelectedImage";
  const review = state.keeping.overwrite.showing;
  const ready = can({ type: "add", frame: state.images + 1, replacing: 0, camera: false }, "Phone");
  const canExport = allowed({ type: "exportPdf" });
  const canSaveDraft = allowed({ type: "saveDraft" });
  const canLoadDraft = allowed({ type: "askToResume" });
  const canDeleteDraft = allowed({ type: "discardDraft" });
  const searchable = allowed({ type: "startSearch" });
  const links = state.text.links.showing
    ? runtime.runSync(Effect.flatMap(ScanAssets, (assets) => assets.words(state.text.linksOf.image, state.text.linksOf.edits)))?.links ?? []
    : [];
  const busy = state.pdf.outcome === "Recorded" || state.pdf.outcome === "Sent";
  return (
    <>
    <Dialog open onOpenChange={(open) => { if (!open) fire({ type: "close" }); }}>
      <DialogContent aria-describedby={undefined} closeLabel={selectedImage ? "Cancel scan" : "Close document"} className="max-h-[min(90dvh,46rem)] shrink-0 overflow-hidden rounded-panel bg-background text-foreground">
        <DialogTitle className="shrink-0 font-display text-title font-light">{selectedImage ? "Scan text" : "Scan document"}</DialogTitle>
        <div role="region" aria-label="Review details" className="min-h-0 space-y-4 overflow-y-auto overscroll-contain">
          <p className="text-sm text-muted-foreground">
            {selectedImage ? "On device" : state.pages.length === 0 ? "No pages" : `${state.pages.length}/${pageLimit} pages`}
          </p>
          {allowed({ type: "showPages" }) && <Button variant="secondary" size="sm" onClick={() => fire({ type: "showPages" })}>Multi-page</Button>}
          {state.keeping.broken && <Alert variant="destructive">The saved draft could not be read.</Alert>}
          {allowed({ type: "resume" }) && (
            <div className="flex items-center justify-between rounded-tile bg-secondary p-3">
              <span>{review ? "Replace these pages with the saved draft?" : "Saved draft"}</span>
              <Button size="sm" onClick={() => fire({ type: "resume" })}>Resume draft</Button>
            </div>
          )}
          {allowed({ type: "takeTheirs" }) && <Button variant="secondary" size="sm" onClick={() => fire({ type: "takeTheirs" })}>Read saved draft</Button>}
          {allowed({ type: "keepMine" }) && <Button variant="secondary" size="sm" onClick={() => fire({ type: "keepMine" })}>Keep my pages</Button>}
          {ready && (
            <div className="flex flex-wrap gap-2">
              <PickPage capture replacing={0} selected={selected} label="Capture new page"><Camera className="size-4" aria-hidden />Capture page</PickPage>
              <PickPage capture={false} replacing={0} selected={selected} label="Add page"><ImagePlus className="size-4" aria-hidden />Add image</PickPage>
            </div>
          )}
          {state.pages.length > 0 && (
            <ol className="space-y-2" aria-label={`${state.pages.length} of ${pageLimit} scanned pages`}>
              {state.pages.map(({ image, text, blank, edits }, at) => {
                const page = runtime.runSync(Effect.flatMap(ScanAssets, (assets) => assets.read(image)));
                const words = text === 0 ? undefined : runtime.runSync(Effect.flatMap(ScanAssets, (assets) => assets.words(image, edits)));
                const begin = { type: "begin", image } as const;
                const read = { type: "recognize", image } as const;
                const reading = state.text.reading.status === "Loading" && state.text.read === image;
                const event = state.text.eventOf.image === image && state.text.eventOf.edits === edits ? state.text.event : undefined;
                const suggestion = event !== undefined && state.text.found ? runtime.runSync(Effect.flatMap(ScanAssets, (assets) => assets.event(event.ticket))) : undefined;
                const replace = can({ type: "add", frame: state.images + 1, replacing: image, camera: true }, "Phone");
                const number = at + 1;
                const earlier = { type: "swapPages", at: at - 1, earlier: state.pages[at - 1]?.image ?? 0, later: image } as const;
                const later = { type: "swapPages", at, earlier: image, later: state.pages[at + 1]?.image ?? 0 } as const;
                return (
                  <li key={image} className="grid gap-3 rounded-segment border border-border bg-background p-3">
                    {!selectedImage && <p className="font-semibold">Page {number}</p>}
                    {page !== undefined && <img src={page.uri} alt={selectedImage ? "Selected image" : `Document page ${number}`} className="h-32 w-full object-contain" loading="lazy" />}
                    <div className="flex flex-wrap gap-1 empty:hidden">
                      {!selectedImage && <>
                        <Button variant="secondary" size="icon" className={pageAction} aria-label={`Move page ${number} earlier`} disabled={!allowed(earlier)} onClick={() => fire(earlier)}><ArrowUp /></Button>
                        <Button variant="secondary" size="icon" className={pageAction} aria-label={`Move page ${number} later`} disabled={!allowed(later)} onClick={() => fire(later)}><ArrowDown /></Button>
                      </>}
                      {replace && correction.can(begin, "Owner") && <Button variant="secondary" size="icon" className={pageAction} aria-label={`Correct page ${number}`} onClick={() => void correction.send(begin, "Owner")}><Crop /></Button>}
                      {replace && <PickPage iconOnly capture={false} replacing={image} selected={selected} label={`Replace page ${number}`}><ImagePlus aria-hidden /></PickPage>}
                      {replace && <PickPage iconOnly capture replacing={image} selected={selected} label={`Retake page ${number}`}><Camera aria-hidden /></PickPage>}
                      {!selectedImage && allowed({ type: "remove", image }) && <Button variant="secondary" size="icon" className={pageAction} aria-label={`Remove page ${number}`} onClick={() => fire({ type: "remove", image })}><Trash2 /></Button>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 empty:hidden">
                      {allowed({ type: "keepPhoto", image }) && <Button variant="secondary" size="sm" onClick={() => fire({ type: "keepPhoto", image })}><Save />Keep photo</Button>}
                      {reading && selectedImage ? <p role="status" className="text-sm text-muted-foreground">Reading text…</p> : allowed(read) && <Button variant="secondary" size="sm" loading={reading} onClick={() => fire(read)}>Read text</Button>}
                      {allowed({ type: "copyText", image }) && <Button variant="secondary" size="sm" onClick={() => fire({ type: "copyText", image })}>Copy text</Button>}
                      {allowed({ type: "reviewLinks", image }) && <Button variant="secondary" size="sm" onClick={() => fire({ type: "reviewLinks", image })}>Review links</Button>}
                      {allowed({ type: "suggestEvent", image }) && <Button variant="secondary" size="sm" loading={event?.status === "Loading"} onClick={() => fire({ type: "suggestEvent", image })}>Suggest event</Button>}
                    </div>
                    {suggestion !== undefined && event !== undefined && (
                      <div className="grid gap-2 rounded-tile bg-secondary p-3">
                        <strong>{suggestion.fields.title}</strong>
                        {suggestion.disclosures.map((detail) => <p key={detail} className="text-sm">{detail}</p>)}
                        <Button size="sm" onClick={() => void runtime.runPromiseExit(reviewCalendarEvent(event.ticket))}>Review in Calendar</Button>
                      </div>
                    )}
                    {event?.status === "Loaded" && !suggestion && <p className="text-sm text-muted-foreground">No date and time found</p>}
                    {blank && <p className="text-sm text-muted-foreground">No text found</p>}
                    {!blank && words !== undefined && (
                      <details open={selectedImage || undefined}>
                        <summary className="font-semibold">{selectedImage ? "Scanned text" : "Review page text"}</summary>
                        {words.lines.length === 0 ? <p className="whitespace-pre-wrap">{words.text}</p> : words.lines.map((line, index) => (
                          <label key={`${line.x}:${line.y}:${line.width}:${line.height}`} className="mb-1 block">
                            <span className="sr-only">Line {index + 1}</span>
                            <Input defaultValue={line.text} className="w-full rounded-sm border border-input bg-background p-2 text-sm" maxLength={2_000}
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
          {state.pdf.outcome === "Unknown" && <Alert variant="destructive">Saving the PDF could not be confirmed.</Alert>}
          {state.text.note.outcome === "Unknown" && <Alert variant="destructive">Saving the note could not be confirmed.</Alert>}
          {allowed({ type: "makeNote" }) && (
            <Dialog>
              <DialogTrigger asChild><Button variant="secondary" size="sm">Make note</Button></DialogTrigger>
              <NoteReview runtime={runtime} pages={state.pages} save={() => fire({ type: "makeNote" })} />
            </Dialog>
          )}
          {(canSaveDraft || canLoadDraft || canDeleteDraft) && (
            <details>
              <summary className={cn("min-h-11 cursor-pointer content-center text-sm text-muted-foreground", focusRing)}>Draft options</summary>
              <div className="flex flex-wrap gap-2">
                {canSaveDraft && <Button variant="secondary" size="sm" aria-label="Save document draft" onClick={() => fire({ type: "saveDraft" })}>Save draft</Button>}
                {canLoadDraft && <Button variant="secondary" size="sm" aria-label="Load saved draft" onClick={() => fire({ type: "askToResume" })}>Resume draft</Button>}
                {canDeleteDraft && (
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
              </div>
            </details>
          )}
        </div>
        {(canExport || busy) && (
          <div className="flex shrink-0 flex-wrap gap-2 border-t border-border pt-3">
            <Button className="min-h-11 flex-1 basis-36 justify-start" loading={busy} onClick={() => fire({ type: "exportPdf" })}>{selectedImage ? "Save photo PDF" : "Save PDF"}</Button>
            {searchable && <Button variant="ghost" className="min-h-11 flex-1 basis-36 justify-start" onClick={() => fire({ type: "startSearch" })}>Searchable PDF</Button>}
          </div>
        )}
      </DialogContent>
    </Dialog>
    <ScanCorrection runtime={runtime} />
    {state.search.stage !== "SearchClosed" && <ScanSearchable key={state.search.ticket} runtime={runtime} state={state} close={() => fire({ type: "cancelSearch", ticket: state.search.ticket })} />}
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
