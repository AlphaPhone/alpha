// spec/app/voice/index.md, "Story: Dictate into a field"; spec/app/voice/dictation.md, "A microphone failure ends dictation quietly and a failed transcription keeps its clip"
import { Button, cn, Textarea } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { Check, Mic, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import type { Machine as Voice } from "../../gen/app__voice.effect.vibe";
import { useMachine } from "../../gen/app__voice.react.ts";
import { closeDictationForKeyboard, dictationReturnedToKeyboard, editDictation } from "../assistant/dictation.vibe";
import type { VoiceBridge } from "../platform/voice.vibe";
import { untimed } from "../runtime/reactor.vibe";
import { DictationClock } from "./dictation-clock.vibe";
import { VoiceStopIcon } from "./VoiceStopIcon.tsx";
import { VoiceWords } from "./voice.vibe";
import type { DictationKeyboard } from "./useTalkKeyboard.ts";

const recordingMarks = Array.from({ length: 44 }, (_, index) => index);

/** The controls and confirmed time of the current composer recording, including transcript review. */
export function DictationControls({ runtime, onKeyboard }: {
  runtime: ManagedRuntime.ManagedRuntime<Voice | VoiceWords | DictationClock | VoiceBridge, unknown>;
  onKeyboard: DictationKeyboard;
}) {
  const { state, can, send } = useMachine(runtime);
  const clock = runtime.runSync(DictationClock);
  const elapsed = useSyncExternalStore(clock.subscribe, clock.snapshot, clock.snapshot);
  const [leaving, setLeaving] = useState<number>();
  if (!state || state.recorder.field !== "ComposerField" || state.recorder.stage === "Closed") return null;
  const { recorder } = state;
  const pending = leaving === recorder.ticket;
  if (recorder.stage === "Closed") return null;
  const { dictatedText, dictatedDurationMs } = runtime.runSync(VoiceWords).memory;
  const start = { type: "startRecording" } as const;
  const stop = { type: "stopRecording", now: untimed } as const;
  const retry = { type: "transcribeAgain", now: untimed } as const;
  const another = { type: "recordAgain" } as const;
  const use = { type: "fill" } as const;
  const close = { type: "closeRecorder" } as const;
  const settings = { type: "openSettings" } as const;
  const recording = recorder.stage === "Recording";
  const review = recorder.stage === "Review";
  const retired = recorder.stage === "Recorded" || recorder.stage === "Review" || recorder.stage === "Transcribing";
  const seconds = recording && elapsed.ticket === recorder.ticket ? elapsed.seconds
    : retired ? (dictatedDurationMs === undefined ? undefined : Math.floor(dictatedDurationMs / 1000))
      : 0;
  const primary = {
    Ready: { label: "Start recording", icon: Mic, event: start, enabled: can(start) && !can(settings) },
    Starting: { label: "Starting microphone", icon: Mic, event: start, enabled: false },
    Recording: { label: "Stop recording", icon: VoiceStopIcon, event: stop, enabled: can(stop) },
    Transcribing: { label: "Cancel transcription", icon: VoiceStopIcon, event: close, enabled: can(close) },
    Recorded: { label: "Try transcription again", icon: Mic, event: retry, enabled: can(retry) },
    Review: { label: "Use in draft", icon: Check, event: use, enabled: can(use) },
  }[recorder.stage];
  const PrimaryIcon = primary.icon;
  return (
    <section aria-label="Voice transcription" aria-busy={pending} className={cn("flex flex-col gap-3 px-5 pt-2 pb-5", review ? "shrink-0" : "min-h-fit flex-1")}>
      <div className="flex shrink-0 items-center gap-3">
        <span className="flex-1 font-display text-recorder-clock font-light tabular-nums">
          {seconds === undefined ? null : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
        </span>
        <Button variant="ghost" size="icon" aria-label="Switch to keyboard" disabled={pending} onClick={(event) => {
          const { ticket } = recorder;
          onKeyboard(event.currentTarget, ticket, async () => {
            setLeaving(ticket);
            try {
              const closed = await runtime.runPromiseExit(closeDictationForKeyboard(ticket));
              return closed._tag === "Success" && closed.value;
            } finally {
              setLeaving((current) => current === ticket ? undefined : current);
            }
          }, () => {
            const closed = runtime.runSyncExit(dictationReturnedToKeyboard(ticket));
            return closed._tag === "Success" && closed.value;
          });
        }}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M8 14h8" />
          </svg>
        </Button>
        {can(close) && <Button variant="ghost" size="icon" aria-label="Discard transcription" disabled={pending} onClick={() => void send(close)}><X /></Button>}
      </div>
      {review ? <Textarea aria-label="Review transcript" value={dictatedText} disabled={pending} onChange={(event) => void runtime.runPromise(editDictation(event.target.value))}
        className="min-h-28 resize-y rounded-lg border-0 bg-secondary p-3 text-base leading-transcript" /> : (
        <div className="min-h-0 flex-1">
          {recording && <div role="img" aria-label="Recording activity" className="flex min-h-10 shrink-0 items-center gap-0.75">
            {recordingMarks.map((mark) => <span key={mark} aria-hidden className="h-1 flex-1 rounded-full bg-primary" />)}
          </div>}
        </div>
      )}
      <Button className="min-h-14 gap-2.5 rounded-sheet px-4" disabled={pending || !primary.enabled} onClick={() => void send(primary.event)}>
        <PrimaryIcon aria-hidden="true" className="size-6" />{primary.label}
      </Button>
      {can(another) && <Button variant="secondary" className="h-11 rounded-tile px-4 font-normal" disabled={pending} onClick={() => void send(another)}>
        <Mic aria-hidden className="size-5" />Record again
      </Button>}
    </section>
  );
}
