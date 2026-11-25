// spec/app/notes/trash.md, "Story: Delete a note and get it back"; spec/app/notes/trash.md, "Story: Erase for good"; spec/app/notes/trash.md, "Story: Leave Recently deleted"
import { Alert, AppHeader, Button, NoteRow, Sheet, SheetContent, Spinner } from "@repo/ui";
import { ChevronLeft, Trash2 } from "lucide-react";
import type * as Trash from "../../gen/app__notes__trash.ts";
import { useMachine as useTrash } from "../../gen/app__notes__trash.react.ts";
import type { Alpha } from "../runtime/area.tsx";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { type Collection, numberOf } from "./content.vibe";
import { titleOf } from "./present.ts";

const dateTime = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const deletionDate = (at: number) => `Deleted ${dateTime.format(at).replace(/[\u00a0\u202f]/g, " ")}`;
const contrast = "bg-foreground text-background hover:bg-foreground/90 active:bg-foreground/80";
const back = { type: "back" } as const;
const askEmpty = { type: "askEmpty" } as const;
const confirm = { type: "confirm", storage: true, now: untimed } as const;

/** Deleted notes keep their own list and are reviewed in a sheet before any change. */
export function RecentlyDeleted({ runtime, collection }: { readonly runtime: Alpha["runtime"]; readonly collection: Collection }) {
  const model = useTimed(runtime, useTrash);
  const state = model.state;
  if (!state || (!state.showing && state.question !== "AskFull")) return null;
  const can = (event: Trash.Event) => model.can(event, "Owner");
  const send = (event: Trash.Event) => void model.send(event, "Owner");
  const noteAt = (id: number) => collection.trash.find(({ note }) => numberOf("note", note.id) === id)?.note;
  const selected = state.entries.find(({ id }) => id === state.opened);
  const full = state.question === "AskFull";
  const emptying = state.question === "AskEmpty";
  const reviewing = state.question !== "NoQuestion";
  const named = noteAt(state.question === "AskErase" ? state.target : state.opened);
  const title = named === undefined ? "Untitled" : titleOf(named);
  const heading = full ? "Full" : emptying ? "Delete all?" : reviewing ? `Delete “${title}”?` : title;
  const details = full ? "Recently deleted is full." : reviewing ? "This can’t be undone." : selected && deletionDate(selected.at);
  const recover = { type: "recover", id: state.opened, now: untimed, storage: true } as const;
  const askErase = { type: "askErase", id: state.opened } as const;

  return <>
    {state.showing && <section aria-label="Recently deleted" data-alpha-subview="notes-trash" className="flex min-h-0 flex-1 flex-col">
      <AppHeader title="Recently deleted" detail
        className="min-h-14 shrink-0 [&>h1]:ml-1 [&>h1]:font-display [&>h1]:text-title [&>h1]:font-light [&>button[data-notes-empty][aria-label]]:h-12 [&>button[data-notes-empty][aria-label]]:w-auto"
        leading={<Button size="icon" variant="ghost" aria-label="Back to notes" onClick={() => send(back)}><ChevronLeft /></Button>}>
        {state.entries.length > 0 && <Button data-notes-empty="" aria-label="Empty Recently deleted" className="px-3.5 text-md"
          variant="ghost" disabled={!can(askEmpty)} onClick={() => send(askEmpty)}>Empty</Button>}
      </AppHeader>
      <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto px-4 pb-[11.875rem]">
        {state.read.status === "Loading" && <Spinner label="Reading deleted notes" />}
        {state.read.status === "Failed" && <Alert variant="warn">Recently deleted is unavailable</Alert>}
        {state.failed && <Alert variant="warn">Couldn't change Recently deleted</Alert>}
        {state.unsure && <Alert variant="warn">Alpha couldn't confirm the last change</Alert>}
        <ul aria-label="Recently deleted notes">
          {state.entries.map((entry) => {
            const note = noteAt(entry.id);
            if (note === undefined) return null;
            const view = { type: "openEntry", id: entry.id } as const;
            const description = deletionDate(entry.at);
            return <li key={entry.id}>
              <NoteRow title={titleOf(note)} date="" preview={description} aria-label={titleOf(note)} aria-description={description}
                disabled={!can(view)} onClick={() => send(view)} />
            </li>;
          })}
        </ul>
      </div>
    </section>}
    <Sheet open={reviewing || selected !== undefined} onOpenChange={(open) => { if (!open && can(back)) send(back); }}>
      <SheetContent title={heading} description={details} data-alpha-notes-trash-sheet=""
        {...(!reviewing && { "data-alpha-notes-recovery": "", "aria-labelledby": undefined, "aria-label": `Recover “${title}”?` })}
        className="bottom-27 max-h-[calc(100dvh-8.75rem)] gap-6 bg-muted px-6 pt-7 pb-[calc(0.75rem+max(1.75rem,calc(max(var(--alpha-native-inset-bottom,0px),env(safe-area-inset-bottom))+0.75rem)))] before:absolute before:top-3 before:left-1/2 before:h-1 before:w-10 before:-translate-x-1/2 before:rounded-full before:bg-muted-foreground/45 [&>div:first-child]:gap-2 [&>div:last-child]:gap-2.5 [&_h2]:font-display [&_h2]:text-home-display [&_h2]:font-light"
        actions={reviewing ? <>
          <Button variant="secondary" size="lg" className="text-md" onClick={() => send({ type: "cancel" })}>Cancel</Button>
          {!full && <Button size="lg" className={`text-md ${contrast}`} disabled={!can(confirm)} onClick={() => send(confirm)}>
            <Trash2 className="size-4.5" /> {emptying ? "Delete all" : "Delete"}
          </Button>}
        </> : <>
          <Button variant="secondary" size="lg" className="text-md" disabled={!can(askErase)} onClick={() => send(askErase)}>Delete now</Button>
          <Button size="lg" className={`text-md ${contrast}`} disabled={!can(recover)} onClick={() => send(recover)}>Recover</Button>
        </>}>
        {(state.failed || state.unsure) && <Alert variant="warn">
          {state.unsure ? "Alpha couldn't confirm the last change" : "Couldn't change Recently deleted"}
        </Alert>}
      </SheetContent>
    </Sheet>
  </>;
}
