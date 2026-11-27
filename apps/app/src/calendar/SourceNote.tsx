// spec/app/notes/note.md, "Story: Review a Calendar draft from a note"
import { CalendarEventAction } from "@repo/ui";
import { Notebook } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import type { CalendarProps } from "./Calendar.tsx";
import { storedOrigin, type Target } from "./noteOrigin.vibe";
import { followSourceNote } from "./sourceNote.vibe";

interface Props {
  readonly runtime: CalendarProps["runtime"];
  readonly account: number;
  readonly selection: number;
  readonly target: Target;
  readonly record?: string;
}

export function SourceNote({ runtime, account, selection, target, record }: Props) {
  const store = useMemo(() => {
    let found = false;
    return {
      snapshot: () => found,
      subscribe: (notify: () => void) => {
        if (record === undefined || record === "") return () => {};
        const controller = new AbortController();
        void runtime.runPromise(storedOrigin(account, target, record), { signal: controller.signal }).then((origin) => {
          if (!controller.signal.aborted && origin !== undefined) {
            found = true;
            notify();
          }
        }).catch(() => {});
        return () => controller.abort();
      },
    };
  }, [runtime, account, target, record]);
  const present = useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
  if (!present || record === undefined) return null;
  return <CalendarEventAction aria-label="Open source note"
    onClick={() => void runtime.runPromise(followSourceNote(account, selection, target, record))}>
    <Notebook aria-hidden />From note
  </CalendarEventAction>;
}
