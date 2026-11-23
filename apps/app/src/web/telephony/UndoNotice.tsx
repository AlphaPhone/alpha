// spec/telephony/messages.md, "Delete passes the exact listed row after confirmation, and an unconfirmed delete keeps the row and blocks another"; spec/telephony/voicemail.md, "A delete needs the owner's confirmation of the open voicemail, and a refused delete keeps it"; spec/telephony/contacts.md, "A removal needs the owner's confirmation of the contact read whole, at its version"
import { Effect, Stream } from "effect";
import { useCallback, useSyncExternalStore } from "react";
import { ContactsView } from "../../telephony/contacts.vibe";
import { MessagesView } from "../../telephony/messages.vibe";
import { DeletionUndo, type UndoView } from "../../telephony/undo.vibe";
import { VoicemailView } from "../../telephony/voicemail.vibe";
import { UndoNoticeView } from "./UndoNoticeView.tsx";
import { runtime, type TelephonyRuntime } from "./runtime.ts";

const empty: UndoView = { notices: [], said: "" };

type Store = { get: () => UndoView; subscribe: (notify: () => void) => () => void };
const stores = new WeakMap<object, Store>();

function storeOf(on: TelephonyRuntime): Store {
  const known = stores.get(on);
  if (known) return known;
  let seen = empty;
  const listeners = new Set<() => void>();
  let stop: (() => void) | undefined;
  const made: Store = {
    get: () => seen,
    subscribe: (notify) => {
      listeners.add(notify);
      if (stop === undefined) {
        const fiber = on.runFork(DeletionUndo.use((u) => Stream.runForEach(u.changes, (next) => Effect.sync(() => {
          seen = next;
          for (const listener of listeners) listener();
        }))));
        stop = () => fiber.interruptUnsafe();
      }
      return () => {
        listeners.delete(notify);
        if (listeners.size === 0) {
          stop?.();
          stop = undefined;
        }
      };
    },
  };
  stores.set(on, made);
  return made;
}

export interface UndoNoticeProps {
  /** The runtime the notice runs on. */
  runtime?: TelephonyRuntime;
}

/**
 * The notices surface for telephony deletions; a kept deletion reads its list again.
 */
export function UndoNotice({ runtime: on = runtime }: UndoNoticeProps) {
  const store = storeOf(on);
  const undo = useSyncExternalStore(store.subscribe, store.get, store.get);
  const watch = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const watching = on.runFork(DeletionUndo.use((u) => u.run()));
    return () => watching.interruptUnsafe();
  }, [on]);
  return (
    <div ref={watch} className="contents">
      <UndoNoticeView
        undo={undo}
        onUndo={async (key) => {
          const answer = await on.runPromise(DeletionUndo.use((u) => u.undo(key)));
          if (!answer.kept) return;
          if (answer.kind === "message" || answer.kind === "thread") on.runFork(MessagesView.use((v) => v.refresh(false)));
          else if (answer.kind === "voicemail") on.runFork(VoicemailView.use((v) => v.refresh()));
          else on.runFork(ContactsView.use((v) => v.read("", true)));
        }}
        onDismiss={(key) => on.runFork(DeletionUndo.use((u) => u.dismiss(key)))}
      />
    </div>
  );
}
