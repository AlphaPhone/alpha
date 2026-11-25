// spec/app/voice/index.md, "Story: Dictate into a field"; spec/app/voice/dictation.md, "A microphone failure ends dictation quietly and a failed transcription keeps its clip"
import { Button, Spinner, Textarea } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Mic, Square, X } from "lucide-react";
import type { Machine as Voice } from "../../gen/app__voice.effect.vibe";
import { useMachine } from "../../gen/app__voice.react.ts";
import { editDictation } from "../assistant/dictation.vibe";
import { untimed } from "../runtime/reactor.vibe";
import { VoiceWords } from "./voice.vibe";

/** The controls the recorder admits while Ask Alpha is receiving dictation, with icons for its status and actions for a kept clip. */
export function DictationControls({ runtime }: { runtime: ManagedRuntime.ManagedRuntime<Voice | VoiceWords, unknown> }) {
  const { state, can, send } = useMachine(runtime);
  if (!state || state.recorder.field !== "ComposerField" || state.recorder.stage === "Closed") return null;
  const { recorder } = state;
  const start = { type: "startRecording" } as const;
  const stop = { type: "stopRecording", now: untimed } as const;
  const retry = { type: "transcribeAgain", now: untimed } as const;
  const another = { type: "recordAgain" } as const;
  const use = { type: "fill" } as const;
  const close = { type: "closeRecorder" } as const;
  const settings = { type: "openSettings" } as const;
  const text = runtime.runSync(VoiceWords).memory.dictatedText;
  return (
    <section aria-label="Voice transcription" className="flex flex-col gap-2 rounded-sheet bg-secondary px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        {recorder.stage === "Starting" || recorder.stage === "Transcribing" ? <Spinner size="sm" aria-hidden /> : recorder.stage === "Recording" ? <Mic aria-hidden className="size-5 text-alpha" /> : <span />}
        {can(close) && <Button variant="ghost" size="icon" aria-label="Discard transcription" onClick={() => void send(close)}><X /></Button>}
      </div>
      {recorder.stage === "Review" && <Textarea aria-label="Transcription" value={text} onChange={(event) => void runtime.runPromise(editDictation(event.target.value))} />}
      <div className="flex flex-wrap justify-end gap-2">
        {can(another) && <Button variant="ghost" onClick={() => void send(another)}>Record again</Button>}
        {can(retry) && <Button onClick={() => void send(retry)}>Try transcription again</Button>}
        {can(start) && !can(settings) && <Button onClick={() => void send(start)}><Mic aria-hidden />Start recording</Button>}
        {can(stop) && <Button onClick={() => void send(stop)}><Square aria-hidden />Stop recording</Button>}
        {can(use) && <Button onClick={() => void send(use)}>Use in conversation</Button>}
      </div>
    </section>
  );
}
