// spec/app/files/trash.md, "Story: See what is in the Trash"; spec/app/files/trash.md, "Story: Bring something back"; spec/app/files/trash.md, "Story: Erase for good"; spec/app/files/trash.md, "The owner restores everything listed that is still kept, together, from a list read since the last job"; spec/app/files/trash.md, "The owner marks listed entries, one by one or every one, and a mark lasts while its entry is listed and no job has started"; spec/app/files/trash.md, "The phone keeps an item thirty days from when it went in; its days left count down from thirty and never go below zero"
import { Alert, AppHeader, Button, Checkbox, Dialog, DialogContent, DialogTitle, EmptyState, ListGroup, ListRow, Spinner } from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import { AudioLines, ChevronLeft, FileText, Folder, Image, Trash2, Video } from "lucide-react";
import type { Machine } from "../../gen/app__files__trash.effect.vibe";
import { daysLeft, view } from "../../gen/app__files__trash.ts";
import { useMachine } from "../../gen/app__files__trash.react.ts";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { Time } from "../runtime/time.vibe";
import { TrashFacts } from "./trashFacts.vibe";

export interface TrashProps {
  /** Provides the Trash machine, of files.vibe, and Alpha's time, at which `can` is asked. */
  runtime: ManagedRuntime.ManagedRuntime<Machine | Time | TrashFacts, unknown>;
  /** Back to the top of Files, where the rules allow it. */
  onBack?: (() => void) | undefined;
}

/**
 * The Trash: what it lists, each item brought back or erased, and everything erased at once, always after the owner
 * saw what goes; how a job ended.
 * @model spec/app/files/trash.md
 */
export function Trash({ runtime, onBack }: TrashProps) {
  const { state, can, send } = useTimed(runtime, useMachine);
  if (!state) return null;
  const owner = <E extends Parameters<typeof can>[0]>(event: E) => can(event, "Owner");
  const tell = <E extends Parameters<typeof send>[0]>(event: E) => void send(event, "Owner");
  const shown = view(state);
  const ended = state.attempt.outcome;
  const now = runtime.runSync(Effect.flatMap(Time, (time) => time.latest()));
  const left = (days: number) => (days === 1 ? "1 day left" : `${days} days left`);
  const detail = state.entries.find((entry) => entry.mark === state.details);
  const facts = runtime.runSync(Effect.flatMap(TrashFacts, (trash) => trash.rows()));
  const details = detail === undefined ? undefined : facts.get(detail.mark);
  const restore = detail === undefined ? undefined : { type: "restore", entry: detail, now: untimed } as const;
  const erase = detail === undefined ? undefined : { type: "askToErase", entry: detail } as const;
  return (
    <section aria-label="Trash" className="flex min-h-0 flex-1 flex-col">
      <AppHeader title="Trash" detail leading={onBack && <Button variant="ghost" size="icon" aria-label="Files" onClick={onBack}><ChevronLeft /></Button>}>
        {owner({ type: "refresh" }) && <Button variant="ghost" className="h-11 px-3.5" onClick={() => tell({ type: "refresh" })}>Refresh</Button>}
        {owner({ type: "restoreAll", now: untimed }) && <Button variant="ghost" className="h-11 px-3.5" onClick={() => tell({ type: "restoreAll", now: untimed })}>Restore all</Button>}
        {owner({ type: "askToEmpty" }) && <Button variant="ghost" aria-label="Empty the Trash" className="h-11 px-3.5 text-warn" onClick={() => tell({ type: "askToEmpty" })}>Empty</Button>}
      </AppHeader>
      <div className="min-h-0 flex-1 touch-pan-y space-y-3 overflow-y-auto px-2 pb-28">
      {state.marked.length > 0 && (
        <div role="toolbar" aria-label="Marked" className="flex flex-wrap gap-2">
          {owner({ type: "markAll" }) && state.marked.length < state.entries.length && <Button variant="ghost" size="sm" onClick={() => tell({ type: "markAll" })}>Mark all</Button>}
          {owner({ type: "restoreMarked", now: untimed }) && <Button variant="outline" size="sm" onClick={() => tell({ type: "restoreMarked", now: untimed })}>Restore marked</Button>}
          {owner({ type: "askToEraseMarked" }) && <Button variant="outline" size="sm" onClick={() => tell({ type: "askToEraseMarked" })}>Erase marked</Button>}
          {owner({ type: "unmark" }) && <Button variant="ghost" size="sm" onClick={() => tell({ type: "unmark" })}>Cancel</Button>}
        </div>
      )}
      {(ended === "Refused" || ended === "Unknown") && <Alert variant="warn">{ended === "Unknown" ? "Alpha cannot tell how far the phone got" : "The phone did not do all of it"}</Alert>}
      {shown === "NoAccess" && <Alert variant="warn">Alpha may not read your files</Alert>}
      {shown === "Reading" && <Spinner label="Reading the Trash" />}
      {shown === "Unreadable" && <Alert variant="destructive">The Trash cannot be read now</Alert>}
      {shown === "Empty" && <EmptyState icon={<Trash2 />} title="The Trash is empty" className="gap-3 px-4 pt-24 pb-4 [&_svg]:size-11" />}
      {state.entries.length > 0 && (
        <ListGroup aria-label="In the Trash" surface="plain">
          {state.entries.map((entry) => {
            const open = { type: "openItemDetails", entry } as const;
            const mark = { type: "mark", entry } as const;
            const listed = facts.get(entry.mark);
            const mime = listed?.mimeType ?? "";
            const Icon = listed?.directory ? Folder : mime.startsWith("image/") ? Image : mime.startsWith("video/") ? Video : mime.startsWith("audio/") ? AudioLines : FileText;
            return (
              <div key={entry.mark} className="relative">
              <ListRow
                title={entry.name}
                aria-label={entry.name}
                className="min-h-15 w-full gap-3.5 rounded-drawer-icon px-2 pr-10"
                leading={<span className="grid size-11 shrink-0 place-items-center rounded-md bg-secondary text-foreground"><Icon className="size-5" /></span>}
                selected={state.marked.includes(entry.mark)}
                onClick={owner(open) ? () => tell(open) : undefined}
                trailing={<time dateTime={new Date(entry.until).toISOString()}>{left(daysLeft(entry, now))}</time>}
                detail={listed === undefined ? undefined : listed.directory ? listed.location : `${new Intl.NumberFormat().format(listed.bytes)} bytes · ${listed.location}`}
              />
              {owner(mark) && <Checkbox aria-label={`Mark ${entry.name}`} checked={state.marked.includes(entry.mark)} className="absolute right-2 top-1/2 -translate-y-1/2" onCheckedChange={() => tell(mark)} />}
              </div>
            );
          })}
        </ListGroup>
      )}
      </div>
      <Dialog open={detail !== undefined} onOpenChange={(open) => { if (!open && owner({ type: "closeItemDetails" })) tell({ type: "closeItemDetails" }); }}>
        <DialogContent closeLabel="Close details">
          <DialogTitle>{detail?.name}</DialogTitle>
          {detail !== undefined && (
            <dl aria-label="Trash item details" className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {details !== undefined && <><dt>Original location</dt><dd>{details.location}</dd></>}
              {details !== undefined && !details.directory && <><dt>Size</dt><dd>{new Intl.NumberFormat().format(details.bytes)} bytes</dd></>}
              <dt>Time left</dt><dd>{left(daysLeft(detail, now))}</dd>
            </dl>
          )}
          <div className="flex gap-2 *:flex-1">
            {restore !== undefined && owner(restore) && <Button variant="secondary" onClick={() => tell(restore)}>Restore</Button>}
            {erase !== undefined && owner(erase) && <Button variant="destructive" onClick={() => tell(erase)}>Delete now</Button>}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={state.erasing.showing} onOpenChange={(open) => { if (!open && owner({ type: "keepThem" })) tell({ type: "keepThem" }); }}>
        <DialogContent>
          <DialogTitle>{state.doomed.length === 1 ? `Erase “${state.doomed[0]?.name}” for good?` : `Erase ${state.doomed.length} items for good?`}</DialogTitle>
          {!owner({ type: "erase" }) && <Alert variant="warn">The Trash changed</Alert>}
          <div className="flex gap-2 *:flex-1">
            {owner({ type: "keepThem" }) && <Button variant="secondary" onClick={() => tell({ type: "keepThem" })}>Keep</Button>}
            {owner({ type: "erase" }) && <Button variant="destructive" onClick={() => tell({ type: "erase" })}>Erase</Button>}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** Undo of what was just deleted into the Trash, offered for its moment, wherever Files shows. */
export function Undo({ runtime }: Pick<TrashProps, "runtime">) {
  const { state, can, send } = useTimed(runtime, useMachine);
  const undo = { type: "undoDelete", now: untimed } as const;
  if (!state || !can(undo, "Owner")) return null;
  return (
    <div role="status" className="flex items-center justify-between gap-2">
      <span>{state.binned.length === 1 ? `“${state.binned[0]?.name}” is in the Trash` : `${state.binned.length} items are in the Trash`}</span>
      <Button key={state.undo.until} variant="outline" size="sm" autoFocus onClick={() => void send(undo, "Owner")}>Undo</Button>
    </div>
  );
}
