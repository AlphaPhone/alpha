// spec/app/voice/index.md, "Story: Dictate into a field"
import { Banner, Button, Textarea } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Mic, Square, X } from "lucide-react";
import type { Machine as Voice } from "../../gen/app__voice.effect.vibe";
import { useMachine } from "../../gen/app__voice.react.ts";
import type { Failure, Stage } from "../../gen/app__voice__dictation.ts";
import { editDictation } from "../assistant/dictation.vibe";
import { untimed } from "../runtime/reactor.vibe";
import { VoiceWords } from "./voice.vibe";

const status: Record<Stage, string> = {
  Closed: "", Ready: "Dictation", Starting: "Starting microphone…", Recording: "Recording…",
  Recorded: "Recording saved", Transcribing: "Transcribing…", Review: "Review transcription",
};

const errors: Record<Failure, string> = {
  NoFailure: "", Denied: "Microphone access is off", NoMicrophone: "Could not start the microphone",
  NoSpeech: "No speech was heard", Recognition: "Could not transcribe the recording", AgentUnavailable: "Voice service unavailable",
};

/** The controls the recorder admits while the Ask Alpha composer is receiving dictation. */
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
        <span role="status" className="text-sm text-muted-foreground">{status[recorder.stage]}</span>
        {can(close) && <Button variant="ghost" size="icon" aria-label="Discard transcription" onClick={() => void send(close)}><X /></Button>}
      </div>
      {recorder.failure !== "NoFailure" && <Banner variant="warn" action={can(settings) ? <Button variant="ghost" size="sm" onClick={() => void send(settings)}>Open app settings</Button> : undefined}>{errors[recorder.failure]}</Banner>}
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
