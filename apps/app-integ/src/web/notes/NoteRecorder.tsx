// spec/notes/recorder.md, "Story: Record a voice note"; spec/notes/recorder.md, "Pause, resume and stop act only on the owner's open recording"; spec/notes/recorder.md, "Done claims the save once, and the recording closes only after its note is confirmed"; spec/notes/recorder.md, "Discard asks once for a recording of a second or more, and never while its save is claimed"
import { Check, Mic, Pause, Play, Square, Trash2 } from "lucide-react";
import type { Recorder } from "../../../gen/notes__recorder.ts";
import { Button } from "../components/ui/index.ts";
import { recordingClock, type RecorderDisplay } from "../../notes/recorder.vibe";
import { recorderErrorText } from "./messages.ts";

export type NoteRecorderProps = {
  /** The recorder machine's state. */
  recorder: Recorder;
  /** The clock, meter and words beside it. */
  display: RecorderDisplay;
  /** Whether the rules allow each control now. */
  can: { readonly pause: boolean; readonly resume: boolean; readonly stop: boolean; readonly finish: boolean; readonly discard: boolean; readonly askDiscard: boolean; readonly retry: boolean };
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onFinish: () => void;
  onDiscard: () => void;
  onAskDiscard: () => void;
  onKeep: () => void;
  onRetry: () => void;
};

/**
 * The open voice recorder: elapsed time, level, the words transcribed so far, and its controls.
 * @model spec/notes/recorder.md
 */
export function NoteRecorder({ recorder, display, can, onPause, onResume, onStop, onFinish, onDiscard, onAskDiscard, onKeep, onRetry }: NoteRecorderProps) {
  const error = recorderErrorText[recorder.error];
  return (
    <section className="flex flex-col gap-4 rounded-t-xl bg-card px-4 pb-8 pt-4" aria-label="Voice note recorder">
      <p className="text-center font-mono text-5xl tabular-nums" role="timer" aria-label={`Recorded ${recordingClock(display.durationMs)}`}>{recordingClock(display.durationMs)}</p>
      <div className="flex h-10 items-center justify-center gap-0.5" aria-hidden>
        {display.levels.map((level, index) => <span key={index} className="w-1 rounded-sm bg-primary" style={{ height: `${Math.max(4, Math.round(level * 40))}px` }} />)}
      </div>
      {display.transcript !== "" && <p className="max-h-32 overflow-y-auto text-sm" aria-live="polite">{display.transcript}</p>}
      {error !== "" && <p className="text-center text-sm text-destructive" role="status">{error}</p>}
      {recorder.confirmingDiscard ? (
        <div className="flex justify-center gap-3" role="group" aria-label="Discard this recording?">
          <Button variant="ghost" onClick={onKeep}>Keep</Button>
          <Button variant="destructive" disabled={!can.discard} onClick={onDiscard}>Discard</Button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-4">
          <Button variant="ghost" size="icon" aria-label="Discard recording" disabled={!can.askDiscard && !can.discard} onClick={can.askDiscard ? onAskDiscard : onDiscard}><Trash2 aria-hidden /></Button>
          {recorder.phase === "RecFailed" ? (
            <Button size="icon" aria-label="Start recording" disabled={!can.retry} onClick={onRetry}><Mic aria-hidden /></Button>
          ) : recorder.phase === "RecRecording" ? (
            <Button size="icon" aria-label="Pause recording" disabled={!can.pause} onClick={onPause}><Pause aria-hidden /></Button>
          ) : (
            <Button size="icon" aria-label="Resume recording" disabled={!can.resume} onClick={onResume}><Play aria-hidden /></Button>
          )}
          <Button variant="secondary" size="icon" aria-label="Stop recording" disabled={!can.stop} onClick={onStop}><Square aria-hidden /></Button>
          <Button aria-label="Save voice note" loading={recorder.phase === "RecFinishing"} disabled={!can.finish} onClick={onFinish}><Check aria-hidden />Done</Button>
        </div>
      )}
    </section>
  );
}
