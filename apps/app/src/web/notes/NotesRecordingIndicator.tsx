// spec/notes/recorder.md, "Another owner or leaving Notes detaches the view and keeps the recording"
import { Mic } from "lucide-react";
import type { AppId } from "../app-screen.ts";
import { Button } from "../components/ui/index.ts";
import { useMachine } from "../../../gen/notes__recorder.react.ts";
import { NotesRecorder, recordingClock } from "../../notes/recorder.vibe";
import { notesRuntime, useServiceStream } from "./runtime.ts";

export type NotesRecordingIndicatorProps = {
  /** Open an app, as the shell gives every surface. */
  open: (app: AppId, route?: string) => void;
};

const displays = (recorder: NotesRecorder.Shape) => recorder.display;

/**
 * While a voice note records with Notes closed, one tap returns to it.
 * @model spec/notes/recorder.md
 */
export function NotesRecordingIndicator({ open }: NotesRecordingIndicatorProps) {
  const { state } = useMachine(notesRuntime);
  const display = useServiceStream(NotesRecorder, displays, { durationMs: 0, levels: [], transcript: "", positionMs: 0 });
  if (state === undefined || (state.phase !== "RecRecording" && state.phase !== "RecPaused")) return null;
  return (
    <Button size="sm" variant="secondary" className="m-2 font-mono text-xs uppercase tabular-nums" aria-label={`Voice note ${state.phase === "RecPaused" ? "paused" : "recording"}, ${recordingClock(display.durationMs)}`} onClick={() => open("notes")}>
      <Mic aria-hidden className={state.phase === "RecRecording" ? "text-destructive" : undefined} />{recordingClock(display.durationMs)}
    </Button>
  );
}
