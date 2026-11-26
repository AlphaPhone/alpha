// spec/app/notes/note.md, "Story: Review a Calendar draft from a note"
import { CalendarEventAction } from "@repo/ui";
import { Notebook } from "lucide-react";
import { useEffect, useState } from "react";
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
  const [loaded, setLoaded] = useState<string>();
  const marker = JSON.stringify([account, selection, target, record]);
  useEffect(() => {
    if (record === undefined || record === "") return;
    const controller = new AbortController();
    void runtime.runPromise(storedOrigin(account, target, record), { signal: controller.signal }).then((origin) => {
      if (!controller.signal.aborted) setLoaded(origin === undefined ? undefined : marker);
    }).catch(() => {});
    return () => controller.abort();
  }, [runtime, account, marker, target, record]);
  if (loaded !== marker || record === undefined) return null;
  return <CalendarEventAction aria-label="Open source note"
    onClick={() => void runtime.runPromise(followSourceNote(account, selection, target, record))}>
    <Notebook aria-hidden />From note
  </CalendarEventAction>;
}
