// spec/notes/previousDevice.md, "Story: Read Notes kept by an earlier installation of Alpha"
import { useEffect, useState } from "react";
import { readPreviousDeviceNotes, type PreviousDeviceNotes as PreviousNotesData } from "../../notes/previous-device-notes.ts";
import { Native } from "../../platform/native.vibe";
import { call } from "../shell/services.ts";
import { PreviousDeviceNotesView } from "./PreviousDeviceNotesView.tsx";

/** Reads what an earlier installation of Alpha kept on this phone, and shows it in a sheet. */
export function PreviousDeviceNotes({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<PreviousNotesData>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const pending = new AbortController();
    const read = readPreviousDeviceNotes(
      (slot) => call(Native, (native) => native.invoke("AlphaConnection", "secureRead", { slot })),
      pending.signal,
    );
    void read.then((value) => {
      if (!pending.signal.aborted) setData(value);
    }, () => undefined);
    return () => pending.abort();
  }, [attempt]);

  return <PreviousDeviceNotesView data={data} onClose={onClose} onRetry={() => { setData(undefined); setAttempt((previous) => previous + 1); }} />;
}
