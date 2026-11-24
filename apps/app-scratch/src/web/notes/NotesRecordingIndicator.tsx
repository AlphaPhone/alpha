// spec/notes/recorder.md, "Another owner or leaving Notes detaches the view and keeps the recording"
import { Effect } from "effect";
import type { AppId } from "../app-screen.ts";
import { useMachine } from "../../../gen/notes__recorder.react.ts";
import { NotesRecorder } from "../../notes/recorder.vibe";
import { useServiceStream } from "../shell/services.ts";
import { NotesRecordingBadge } from "./NotesRecordingBadge.tsx";
import { runtime } from "./runtime.ts";

export type NotesRecordingIndicatorProps = {
  /** Open an app, as the shell gives every surface. */
  open: (app: AppId, route?: string) => void;
};

const displays = (recorder: NotesRecorder.Shape) => recorder.display;

/**
 * While a voice note records, the recorder's state and clock as a badge that returns to it.
 * @model spec/notes/recorder.md
 */
export function NotesRecordingIndicator({ open }: NotesRecordingIndicatorProps) {
  const { state } = useMachine(runtime);
  const display = useServiceStream("notes.displays", Effect.map(Effect.service(NotesRecorder), displays), { durationMs: 0, levels: [], transcript: "", positionMs: 0 });
  if (state === undefined || (state.phase !== "RecRecording" && state.phase !== "RecPaused")) return null;
  return <NotesRecordingBadge paused={state.phase === "RecPaused"} durationMs={display.durationMs} onOpen={() => open("notes")} />;
}
