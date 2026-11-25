// spec/app/browser/library.md, "Story: Keep bookmarks"; spec/app/browser/library.md, "Story: Look back through history"
import { Alert, Button, ConfirmDialog, EmptyState, ListGroup, ListRow, Sheet, SheetContent } from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import { useSyncExternalStore } from "react";
import type { Machine } from "../../gen/app__browser__library.effect.vibe";
import { useMachine } from "../../gen/app__browser__library.react.ts";
import { Kept } from "./library.vibe";

export interface LibraryProps {
  runtime: ManagedRuntime.ManagedRuntime<Machine | Kept, unknown>;
  open: boolean;
  onClose: () => void;
  /** Open `url` in the shown tab. */
  onOpen: (url: string) => void;
}

const notices = {
  NotSecure: "Only a secure (HTTPS) page can be bookmarked",
  Full: "Bookmarks are full. Remove one to add another.",
  Unread: "Bookmarks and history are still being read",
  Failed: "That change was not saved",
} as const;

/**
 * The bookmarks and history, newest first, to open one in the shown tab, read the lists again or clear history. Each
 * control is offered exactly when its event is.
 * @model spec/app/browser/library.md
 */
export function Library({ runtime, open, onClose, onOpen }: LibraryProps) {
  const { state, can, send } = useMachine(runtime);
  const kept = runtime.runSync(Effect.map(Kept, (held) => held));
  const lists = useSyncExternalStore(kept.subscribe, kept.now, kept.now);
  if (!state) return null;
  const read = state.read.status === "Loaded";
  const history = [...lists.history].reverse();
  return (
    <>
      <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
        <SheetContent
          title="Bookmarks and history"
          actions={(
            <>
              {can({ type: "askRead" }) && !read && <Button variant="outline" onClick={() => void send({ type: "askRead" })}>Read again</Button>}
              {can({ type: "askClear" }) && <Button variant="outline" onClick={() => void send({ type: "askClear" })}>Clear history</Button>}
            </>
          )}
        >
          {state.notice !== "Quiet" && <Alert variant="warn">{notices[state.notice]}</Alert>}
          {state.read.status === "Failed" && <Alert variant="warn">Bookmarks and history could not be read</Alert>}
          {lists.marks.length === 0 && history.length === 0 && read && <EmptyState title="No bookmarks or history yet" />}
          {lists.marks.length > 0 && (
            <ListGroup aria-label="Bookmarks">
              {lists.marks.map((mark) => <ListRow key={mark.url} title={mark.title || mark.url} detail={mark.title ? mark.url : undefined} onClick={() => { onClose(); onOpen(mark.url); }} />)}
            </ListGroup>
          )}
          {history.length > 0 && (
            <ListGroup aria-label="History">
              {history.map((url, at) => <ListRow key={`${at} ${url}`} title={url} onClick={() => { onClose(); onOpen(url); }} />)}
            </ListGroup>
          )}
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={state.confirming}
        title="Clear history?"
        confirmLabel="Clear"
        destructive
        onConfirm={() => { if (can({ type: "confirmClear" })) void send({ type: "confirmClear" }); }}
        onCancel={() => { if (can({ type: "cancelClear" })) void send({ type: "cancelClear" }); }}
      >
        Every page in history goes. Bookmarks stay.
      </ConfirmDialog>
    </>
  );
}
