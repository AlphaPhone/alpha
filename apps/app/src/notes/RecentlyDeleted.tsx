// spec/app/notes/trash.md, "Story: Delete a note and get it back"; spec/app/notes/trash.md, "Story: Erase for good"; spec/app/notes/trash.md, "Story: Leave Recently deleted"
import { Alert, AppHeader, Button, cn, dockClearance, NoteRow, Sheet, SheetContent, Spinner } from "@repo/ui";
import { ChevronLeft, Trash2 } from "lucide-react";
import type * as Trash from "../../gen/app__notes__trash.ts";
import { useMachine as useTrash } from "../../gen/app__notes__trash.react.ts";
import type { Alpha } from "../runtime/area.tsx";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { type Collection, numberOf } from "./content.vibe";
import { titleOf } from "./present.ts";

let cachedZone = "";
let cachedDateTime: Intl.DateTimeFormat | undefined;

function deletionDate(at: number): string {
  if (!Number.isFinite(at) || at <= 0) return "Deleted";
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (cachedDateTime === undefined || cachedZone !== zone) {
    cachedZone = zone;
    cachedDateTime = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }
  return `Deleted ${cachedDateTime.format(at).replace(/[\u00a0\u202f]/g, " ")}`;
}

const contrast = "bg-foreground text-background hover:bg-foreground/90 active:bg-foreground/80";
const back = { type: "back" } as const;
const askEmpty = { type: "askEmpty" } as const;
const cancel = { type: "cancel" } as const;
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
  const details = full ? "Recently deleted is full. Delete this note now?" : reviewing ? "This can’t be undone." : selected && deletionDate(selected.at);
  const recover = { type: "recover", id: state.opened, now: untimed, storage: true } as const;
  const askErase = { type: "askErase", id: state.opened } as const;

  return <>
    {state.showing && <section aria-label="Recently deleted" data-alpha-subview="notes-trash" className="flex min-h-0 flex-1 flex-col">
      <AppHeader title="Recently deleted" detail
        leading={<Button size="icon" variant="ghost" aria-label="Back to notes" disabled={!can(back)} onClick={() => send(back)}><ChevronLeft /></Button>}>
        {state.entries.length > 0 && <Button data-notes-empty="" aria-label="Empty Recently deleted" className="px-3.5 text-md"
          variant="ghost" disabled={!can(askEmpty)} onClick={() => send(askEmpty)}>Empty</Button>}
      </AppHeader>
      <div className={cn("min-h-0 flex-1 touch-pan-y overflow-y-auto px-4", dockClearance)}>
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
        {...(!reviewing && { "data-alpha-notes-recovery": "" })}
        className={cn("bottom-[calc(max(var(--alpha-dock-overlap,0px),var(--alpha-safe-bottom))+0.75rem)] max-h-[calc(var(--alpha-viewport-height,100dvh)-8.75rem)] gap-6 bg-card px-6 pt-7 shadow-none", dockClearance)}
        actions={reviewing ? <>
          <Button variant="secondary" size="lg" className="text-md" disabled={!can(cancel)} onClick={() => send(cancel)}>Cancel</Button>
          <Button size="lg" className={cn("text-md", contrast)} disabled={!can(confirm)} onClick={() => send(confirm)}>
            <Trash2 className="size-4.5" /> {full ? "Delete now" : emptying ? "Delete all" : "Delete"}
          </Button>
        </> : <>
          <Button variant="secondary" size="lg" className="text-md" disabled={!can(askErase)} onClick={() => send(askErase)}>Delete now</Button>
          <Button size="lg" className={cn("text-md", contrast)} disabled={!can(recover)} onClick={() => send(recover)}>Recover</Button>
        </>}>
        {(state.failed || state.unsure) && <Alert variant="warn">
          {state.unsure ? "Alpha couldn't confirm the last change" : "Couldn't change Recently deleted"}
        </Alert>}
      </SheetContent>
    </Sheet>
  </>;
}
