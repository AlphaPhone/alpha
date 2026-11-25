// spec/app/voice/index.md, "Story: Dictate into a field"; spec/app/voice/dictation.md, "A microphone failure ends dictation quietly and a failed transcription keeps its clip"
import { Button, Spinner, Textarea } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Check, Mic, Settings, Square, X } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import type { Machine as Voice } from "../../gen/app__voice.effect.vibe";
import { useMachine } from "../../gen/app__voice.react.ts";
import { editDictation } from "../assistant/dictation.vibe";
import { untimed } from "../runtime/reactor.vibe";
import { VoiceWords } from "./voice.vibe";

/** The controls the recorder admits while Ask Alpha is receiving dictation, with icons for its status and actions for a kept clip. */
export function DictationControls({ runtime }: { runtime: ManagedRuntime.ManagedRuntime<Voice | VoiceWords, unknown> }) {
  const { state, can, send } = useMachine(runtime);
  const words = useMemo(() => runtime.runSync(VoiceWords), [runtime]);
  const store = useMemo(() => ({ subscribe: (listener: () => void) => words.subscribe(listener), snapshot: () => words.snapshot() }), [words]);
  const { dictatedText, dictatedDurationMs } = useSyncExternalStore(store.subscribe, store.snapshot);
  if (!state || state.recorder.field !== "ComposerField" || state.recorder.stage === "Closed") return null;
  const { recorder } = state;
  const start = { type: "startRecording" } as const;
  const stop = { type: "stopRecording", now: untimed } as const;
  const retry = { type: "transcribeAgain", now: untimed } as const;
  const another = { type: "recordAgain" } as const;
  const use = { type: "fill" } as const;
  const close = { type: "closeRecorder" } as const;
  const settings = { type: "openSettings" } as const;
  if (recorder.stage === "Review") {
    const seconds = dictatedDurationMs === undefined ? undefined : Math.floor(dictatedDurationMs / 1000);
    return (
      <section aria-label="Voice transcription" className="flex shrink-0 flex-col gap-3 px-5 pt-2 pb-5">
        <div className="flex shrink-0 items-center gap-3">
          <span className="flex-1 font-display text-recorder-clock font-light tabular-nums">
            {seconds === undefined ? null : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
          </span>
          {can(close) && <Button variant="ghost" size="icon" aria-label="Discard transcription" onClick={() => void send(close)}><X /></Button>}
        </div>
        <Textarea aria-label="Review transcript" value={dictatedText} onChange={(event) => void runtime.runPromise(editDictation(event.target.value))}
          className="min-h-28 resize-y rounded-lg border-0 bg-secondary p-3 text-base leading-transcript" />
        <Button className="min-h-14 gap-2.5 rounded-sheet px-4" disabled={!can(use)} onClick={() => void send(use)}>
          <Check aria-hidden className="size-6" />Use in draft
        </Button>
        {can(another) && <Button variant="secondary" className="h-11 rounded-tile px-4 font-normal" onClick={() => void send(another)}>
          <Mic aria-hidden className="size-5" />Record again
        </Button>}
      </section>
    );
  }
  return (
    <section aria-label="Voice transcription" className="flex flex-col gap-2 rounded-sheet bg-secondary px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        {recorder.stage === "Starting" || recorder.stage === "Transcribing" ? <Spinner size="sm" aria-hidden /> : recorder.stage === "Recording" ? <Mic aria-hidden className="size-5 text-record" /> : <span />}
        {can(close) && <Button variant="ghost" size="icon" aria-label="Discard transcription" onClick={() => void send(close)}><X /></Button>}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {can(another) && <Button variant="ghost" onClick={() => void send(another)}>Record again</Button>}
        {can(retry) && <Button onClick={() => void send(retry)}>Try transcription again</Button>}
        {can(settings) && <Button onClick={() => void send(settings)}><Settings aria-hidden />Open Settings</Button>}
        {can(start) && !can(settings) && <Button onClick={() => void send(start)}><Mic aria-hidden />Start recording</Button>}
        {can(stop) && <Button onClick={() => void send(stop)}><Square aria-hidden />Stop recording</Button>}
      </div>
    </section>
  );
}
