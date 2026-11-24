// spec/app/files/preview.md, "Story: Look at a file"; spec/app/files/preview.md, "Story: Act on the file I am looking at"; spec/app/files/preview.md, "Story: Get a file back when access was lost"; spec/app/files/recent.md, "Story: Find what I opened lately"
import { Alert, Button, Dialog, DialogContent, DialogTitle, ListGroup, ListRow, Spinner } from "@repo/ui";
import { Effect, Option, type ManagedRuntime } from "effect";
import type { Machine } from "../../gen/app__files__preview.effect.vibe";
import { loaded, showing, usable } from "../../gen/app__files__preview.ts";
import { useMachine } from "../../gen/app__files__preview.react.ts";
import type { Machine as RecentMachine } from "../../gen/app__files__recent.effect.vibe";
import { useMachine as useRecent } from "../../gen/app__files__recent.react.ts";
import { Handles } from "./handles.vibe";
import { Opened } from "./preview.vibe";

export interface PreviewProps {
  /** Provides the preview and Recent machines, and what the viewer read, of preview.vibe. */
  runtime: ManagedRuntime.ManagedRuntime<Machine | RecentMachine | Opened | Handles, unknown>;
}

/** What the owner calls the document a grant names. */
function nameOf(runtime: PreviewProps["runtime"], grant: number): string | undefined {
  return Option.getOrUndefined(Option.map(runtime.runSync(Effect.flatMap(Opened, (opened) => opened.grant(grant))), (given) => given.name));
}

/**
 * The viewer: one file full screen, its text, picture, recording or PDF page, while it loads or why it cannot be
 * shown, and what the owner can do with it, each offered exactly when the rules take it.
 * @model spec/app/files/preview.md
 */
export function Preview({ runtime }: PreviewProps) {
  const { state, can, send } = useMachine(runtime);
  const recent = useRecent(runtime);
  if (!state || !recent.state || !showing(state)) return null;
  const owner = <E extends Parameters<typeof can>[0]>(event: E) => can(event, "Owner");
  const tell = <E extends Parameters<typeof send>[0]>(event: E) => void send(event, "Owner");
  const content = runtime.runSync(Effect.flatMap(Opened, (opened) => opened.content()));
  const mine = content.viewer === state.viewer && loaded(state);
  const name = recent.state.shown.key === state.item ? nameOf(runtime, recent.state.shown.grant) : undefined;
  return (
    <Dialog open onOpenChange={(open) => { if (!open && owner({ type: "close" })) tell({ type: "close" }); }}>
      <DialogContent closeLabel="Close" aria-label="Preview">
        <DialogTitle>{name ?? "File"}</DialogTitle>
        {!usable(state) && <Alert variant="warn">Alpha can no longer read this file</Alert>}
        {state.content.status === "Loading" && <Spinner label="Opening the file" />}
        {state.content.status === "Failed" && <Alert variant="warn">{state.why === "Locked" ? "This PDF is locked" : state.why === "TooLarge" ? "This file is too large to show" : "This file cannot be shown here"}</Alert>}
        {state.drawing.status === "Failed" && <Alert variant="warn">This page cannot be shown</Alert>}
        {mine && content.text !== undefined && <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap">{content.text}</pre>}
        {mine && state.kind === "Photo" && content.uri && <img alt={name ?? ""} src={content.uri} className="max-h-[60vh] object-contain" />}
        {mine && state.kind === "Media" && content.uri && <video key={String(state.playing)} src={content.uri} autoPlay={state.playing} className="max-h-[60vh]" aria-label={name} />}
        {mine && state.kind === "Pdf" && state.drawing.status === "Loaded" && content.page && <img alt={`Page ${state.page} of ${state.pages}`} src={content.page} className="max-h-[60vh] object-contain" />}
        {state.kind === "Pdf" && state.pages > 1 && (
          <div className="flex items-center justify-between gap-2">
            {owner({ type: "turnTo", page: state.page - 1 }) ? <Button variant="ghost" size="sm" onClick={() => tell({ type: "turnTo", page: state.page - 1 })}>Previous page</Button> : <span />}
            <span>{`${state.page} / ${state.pages}`}</span>
            {owner({ type: "turnTo", page: state.page + 1 }) ? <Button variant="ghost" size="sm" onClick={() => tell({ type: "turnTo", page: state.page + 1 })}>Next page</Button> : <span />}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {owner({ type: "play" }) && <Button variant="outline" size="sm" onClick={() => tell({ type: "play" })}>{state.playing ? "Pause" : "Play"}</Button>}
          {owner({ type: "askAlpha" }) && <Button variant="outline" size="sm" onClick={() => tell({ type: "askAlpha" })}>Ask Alpha</Button>}
          {owner({ type: "openElsewhere" }) && <Button variant="outline" size="sm" onClick={() => tell({ type: "openElsewhere" })}>Open elsewhere</Button>}
          {owner({ type: "selectAgain" }) && <Button size="sm" onClick={() => tell({ type: "selectAgain" })}>Select again</Button>}
          {owner({ type: "forget" }) && <Button variant="ghost" size="sm" onClick={() => tell({ type: "forget" })}>Forget</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Recent: the files opened lately, newest first, each opened again when the phone still lets Alpha read it, and
 * otherwise named as one to select again.
 * @model spec/app/files/recent.md
 */
export function RecentFiles({ runtime }: PreviewProps) {
  const { state, can, send } = useRecent(runtime);
  if (!state || state.rows.length === 0) return null;
  return (
    <ListGroup heading="Recent">
      {state.rows.map((row) => {
        const reopen = { type: "reopen", row } as const;
        const name = nameOf(runtime, row.grant) ?? Option.getOrElse(runtime.runSync(Effect.flatMap(Handles, (handles) => handles.label(row.key))), () => "A file to select again");
        return <ListRow key={`${row.origin} ${row.key}`} title={name} detail={row.grant === 0 ? "Select it again to open it" : undefined} onClick={can(reopen, "Owner") ? () => void send(reopen, "Owner") : undefined} />;
      })}
    </ListGroup>
  );
}
