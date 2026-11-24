// spec/app/files/trash.md, "Story: See what is in the Trash"; spec/app/files/trash.md, "Story: Bring something back"; spec/app/files/trash.md, "Story: Erase for good"; spec/app/files/trash.md, "The owner restores everything listed that is still kept, together, from a list read since the last job"
import { Alert, Button, Dialog, DialogContent, DialogTitle, EmptyState, ListGroup, ListRow, Spinner } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import type { Machine } from "../../gen/app__files__trash.effect.vibe";
import { view } from "../../gen/app__files__trash.ts";
import { useMachine } from "../../gen/app__files__trash.react.ts";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import type { Time } from "../runtime/time.vibe";

export interface TrashProps {
  /** Provides the Trash machine, of files.vibe, and Alpha's time, at which `can` is asked. */
  runtime: ManagedRuntime.ManagedRuntime<Machine | Time, unknown>;
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
  return (
    <section aria-label="Trash" className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        {onBack && <Button variant="ghost" size="sm" onClick={onBack}>Files</Button>}
        <h2 className="font-semibold">Trash</h2>
        {owner({ type: "refresh" }) && <Button variant="ghost" size="sm" onClick={() => tell({ type: "refresh" })}>Refresh</Button>}
        {owner({ type: "restoreAll", now: untimed }) && <Button variant="outline" size="sm" onClick={() => tell({ type: "restoreAll", now: untimed })}>Restore all</Button>}
        {owner({ type: "askToEmpty" }) && <Button variant="outline" size="sm" onClick={() => tell({ type: "askToEmpty" })}>Empty the Trash</Button>}
      </div>
      {(ended === "Refused" || ended === "Unknown") && <Alert variant="warn">{ended === "Unknown" ? "Alpha cannot tell how far the phone got" : "The phone did not do all of it"}</Alert>}
      {shown === "NoAccess" && <Alert variant="warn">Alpha may not read your files</Alert>}
      {shown === "Reading" && <Spinner label="Reading the Trash" />}
      {shown === "Unreadable" && <Alert variant="destructive">The Trash cannot be read now</Alert>}
      {shown === "Empty" && <EmptyState title="The Trash is empty" />}
      {state.entries.length > 0 && (
        <ListGroup aria-label="In the Trash">
          {state.entries.map((entry) => {
            const restore = { type: "restore", entry, now: untimed } as const;
            const erase = { type: "askToErase", entry } as const;
            return (
              <ListRow
                key={entry.mark}
                title={entry.name}
                trailing={(
                  <span className="flex gap-1">
                    {owner(restore) && <Button variant="ghost" size="sm" aria-label={`Restore ${entry.name}`} onClick={() => tell(restore)}>Restore</Button>}
                    {owner(erase) && <Button variant="ghost" size="sm" aria-label={`Erase ${entry.name}`} onClick={() => tell(erase)}>Erase</Button>}
                  </span>
                )}
                detail={<time dateTime={new Date(entry.until).toISOString()}>{`Kept until ${new Date(entry.until).toLocaleDateString()}`}</time>}
              />
            );
          })}
        </ListGroup>
      )}
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
