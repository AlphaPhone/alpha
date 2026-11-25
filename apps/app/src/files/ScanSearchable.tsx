// spec/app/files/scan.md, "Searchable PDF reads only unread pages in order, then asks for a separate save"
import { Alert, Button, Dialog, DialogContent, DialogTitle, Textarea, cn } from "@repo/ui";
import type { Layer } from "effect";
import { useState } from "react";
import type { Scan } from "../../gen/app__files__scan.ts";
import { native } from "../platform/device.vibe";
import type { Shown, Resident } from "../runtime/area.tsx";
import { ScanAssets, confirmSearch, searchWords, type SearchLine, type scan } from "./scan.vibe";
import { scanPanel, scanTitle } from "./scan-dialog.ts";

type Runtime = Layer.Success<typeof scan> | Resident;
const saveProblems = {
  NoProblem: undefined,
  TooLarge: "This document is too large to save.",
  TooMuchText: "This text could not be added to the PDF.",
  NotDrawn: "The PDF could not be prepared.",
} satisfies Record<Scan["problem"], string | undefined>;

/** One editable text-layer draft over the scan's exact current pages. */
export function ScanSearchable({ runtime, state, close }: Pick<Shown<Runtime>, "runtime"> & { state: Scan; close: () => void }) {
  const { search } = state;
  const [edits, setEdits] = useState<ReadonlyMap<string, SearchLine>>(() => new Map());
  const assets = runtime.runSync(ScanAssets);
  const saving = search.stage === "SearchSaving";
  const saveLabel = native() ? "Save" : "Download";
  const ready = search.stage === "SearchReview";
  const problem = saveProblems[state.problem];
  const current = search.pages.findIndex((page) => page.image === search.remaining[0]);
  const submit = (save: boolean) => void runtime.runPromiseExit(confirmSearch(search.ticket, [...edits.values()], save));
  return (
    <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent aria-label="Review searchable PDF" aria-describedby={undefined} closeLabel="Cancel searchable PDF" className={cn(scanPanel, "overflow-y-auto")}>
        <DialogTitle className={scanTitle}>Review text</DialogTitle>
        <p className="text-sm font-medium text-muted-foreground">On device</p>
        {search.stage === "SearchReading" && <p role="status">Reading page {current + 1} of {search.pages.length}…</p>}
        {search.stage === "SearchFailed" && <Alert variant="destructive">Text could not be read. Close and try again.</Alert>}
        {saving && <p role="status">Saving searchable PDF…</p>}
        {ready && search.tried && problem !== undefined && <Alert variant="destructive">{problem}</Alert>}
        {ready && search.tried && state.pdf.outcome === "Refused" && <Alert variant="destructive">The PDF was not saved.</Alert>}
        {search.pages.map((page, index) => {
          const number = index + 1;
          const picture = runtime.runSync(assets.read(page.image));
          const words = runtime.runSync(searchWords(search.ticket, page));
          if (picture === undefined || words === undefined) return null;
          return (
            <section key={page.image} aria-label={`Page ${number}`} className="grid gap-2 rounded-tile bg-secondary p-3">
              <h3 className="font-semibold">Page {number}</h3>
              <img alt={`Scanned page ${number}`} src={picture.uri} className="max-h-[30dvh] w-full object-contain" loading="lazy" />
              {words.lines.length === 0 && <p className="text-sm">No text</p>}
              {words.lines.map((line, position) => {
                const key = `${page.image}:${position}`;
                return (
                  <label key={key} className="grid gap-1 text-sm">
                    <span>Page {number} line {position + 1}</span>
                    <Textarea rows={2} maxLength={4000} value={edits.get(key)?.text ?? line.text} disabled={!ready}
                      onChange={(event) => {
                        const text = event.currentTarget.value;
                        setEdits((prior) => new Map(prior).set(key, { image: page.image, line: position, text }));
                      }} />
                  </label>
                );
              })}
            </section>
          );
        })}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" aria-label="Keep reviewed text" disabled={!ready} onClick={() => submit(false)}>Keep text</Button>
          <Button aria-label={`${saveLabel} reviewed searchable PDF`} disabled={!ready} loading={saving} onClick={() => submit(true)}>{saveLabel} PDF</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
