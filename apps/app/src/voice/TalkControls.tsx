// spec/app/voice/index.md, "Story: Hold a spoken conversation"; spec/app/voice/index.md, "A reply that needs the owner's review in chat keeps voice listening with the microphone open"; spec/app/voice/index.md, "Story: Pause for a phone call"; spec/app/voice/index.md, "A failed conversation ends quietly: why it failed is kept only until voice returns to idle, and nothing is shown"; spec/app/voice/index.md, "Speaker mute is offered after the current speech bridge confirms gain control"
import { Button, ConfirmDialog, cn } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import type { ReactNode } from "react";
import { Keyboard, Mic, MicOff, Square, Volume2, VolumeX } from "lucide-react";
import type { Machine as Shell } from "../../gen/app__shell.effect.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import { Machine } from "../../gen/app__voice.effect.vibe";
import { useMachine } from "../../gen/app__voice.react.ts";
import type { Phase } from "../../gen/app__voice.ts";
import { untimed } from "../runtime/reactor.vibe";
import type { VoiceKeyboard } from "./useTalkKeyboard.ts";
import { VoiceStopIcon } from "./VoiceStopIcon.tsx";
import { VoiceWaveform } from "./VoiceWaveform.tsx";

export interface TalkControlsProps {
  runtime: ManagedRuntime.ManagedRuntime<Machine | Shell, unknown>;
  trailing?: ReactNode;
  compact?: boolean;
  onKeyboard?: VoiceKeyboard;
}

const compactStatus: Record<Phase, string> = {
  Idle: "", Starting: "Connecting to voice", Listening: "Listening", Transcribing: "Transcribing", Thinking: "Thinking",
  Speaking: "Speaking", Paused: "Voice paused for a phone call", Stopping: "Stopping voice", Failed: "",
};

const expandedStatus: Partial<Record<Phase, string>> = {
  Starting: "Connecting…", Listening: "Listening", Transcribing: "Transcribing…", Thinking: "Thinking…", Speaking: "Speaking",
};

/** The controls the Voice machine offers while Talk owns the composer. The sheet shows a brief phase label beside the controls. */
export function TalkControls({ runtime, trailing, compact = false, onKeyboard }: TalkControlsProps) {
  const { state, can, send } = useMachine(runtime);
  const shell = useShell(runtime);
  if (!state || state.phase === "Idle" || state.phase === "Failed") return null;
  const decline = { type: "answerDisclosure", agree: false, now: untimed } as const;
  const allow = { ...decline, agree: true } as const;
  const stop = { type: "stop", keyboard: false } as const;
  const type = { ...stop, keyboard: true } as const;
  const typeAfterStop = async () => (await runtime.runPromiseExit(Machine.use((machine) =>
    machine.send(type, (current) => current.session === state.session),
  )))._tag === "Success";
  const mute = { type: state.muted ? "unmute" : "mute" } as const;
  const open = { type: "raise", detent: "Sheet" } as const;
  const connecting = state.phase === "Starting";
  const phase = state.muted ? "Muted" : state.phase;
  const canMute = can(mute);
  const speakerMuted = state.speaker === "SpeakerOff" || state.speaker === "SpeakerUnmuting";
  const speakerConfirmed = speakerMuted || state.speaker === "SpeakerOn" || state.speaker === "SpeakerMuting";
  const setSpeaker = { type: "setSpeakerMuted", muted: !speakerMuted } as const;
  const spinner = <span aria-hidden="true" className="size-4.5 shrink-0 rounded-full border-2 border-border border-t-alpha motion-safe:animate-spin" style={{ animationDuration: "900ms" }} />;
  const activity = <VoiceWaveform phase={phase} compact={compact} />;
  const review = state.reviewPending && state.phase === "Listening";
  const label = review ? "Review in chat" : compact ? undefined : connecting ? expandedStatus.Starting :
    state.phase === "Stopping" || state.phase === "Paused" ? undefined : state.muted ? "Muted" : expandedStatus[state.phase];
  const status = (
    <p role="status" aria-label={compact ? undefined : "Voice conversation status"} className={cn(label === undefined ? "sr-only" : "flex min-w-0 items-center gap-2.25 text-sm leading-voice-status font-semibold text-foreground", compact && review && "pr-1 text-xs")}>
      {!compact && connecting && spinner}
      <span className={label === undefined ? undefined : "truncate"}>{label ?? (state.muted ? "Microphone muted" : compactStatus[state.phase])}</span>
    </p>
  );
  return (
    <>
      <section aria-label="Voice conversation" data-alpha-pill-voice={compact ? "" : undefined}
        className={cn("flex shrink-0 items-center bg-secondary",
          compact ? "gap-0.5 self-center rounded-dock-compact p-1.25 shadow-dock-compact dark:shadow-dock-compact-dark"
            : "min-h-17 gap-1.5 rounded-sheet py-1.5 pr-1.5 pl-5 [&>button]:size-12")}>
        {compact && shell.can(open) && <Button variant="ghost" size="icon" aria-label="Open conversation" onClick={() => void shell.send(open)}>
          {connecting || state.phase === "Stopping" ? spinner : activity}
        </Button>}
        {compact ? status : (
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            {status}
            {!connecting && activity}
          </div>
        )}
        {!compact && onKeyboard && can(type) && <Button variant="ghost" size="icon" aria-label="Switch to keyboard" onClick={(event) => onKeyboard(event.currentTarget, typeAfterStop)}><Keyboard /></Button>}
        {(!compact || !speakerConfirmed) && can({ type: "interrupt" }) && <Button variant="ghost" size="icon" aria-label="Stop speaking" onClick={() => void send({ type: "interrupt" })}><VolumeX /></Button>}
        {speakerConfirmed && <Button variant="ghost" size="icon" disabled={!can(setSpeaker)} aria-pressed={speakerMuted}
          aria-label={speakerMuted ? "Unmute speaker" : "Mute speaker"} onClick={() => void send(setSpeaker)}>
          {speakerMuted ? <VolumeX /> : <Volume2 />}
        </Button>}
        {(compact || canMute) && <Button variant="ghost" size="icon" disabled={!canMute} aria-pressed={state.muted} aria-label={state.muted ? "Unmute microphone" : "Mute microphone"} onClick={() => void send(mute)}>
          {state.muted ? <MicOff /> : <Mic />}
        </Button>}
        {(compact || can(stop)) && <Button size="icon" className="bg-alpha text-alpha-foreground hover:bg-alpha/90" disabled={!can(stop)} aria-label="Stop voice conversation" onClick={() => void send(stop)}>
          {compact ? <Square className="size-2.5" fill="currentColor" /> : <VoiceStopIcon />}
        </Button>}
        {trailing}
      </section>
      <ConfirmDialog open={state.disclosing} title="Use cloud speech?" confirmLabel="Use cloud speech" cancelLabel="Use on-device speech"
        onConfirm={() => void (can(allow) && send(allow))} onCancel={() => void (can(decline) && send(decline))}>Cloud speech sends microphone audio to Alpha's speech service for this voice conversation.</ConfirmDialog>
    </>
  );
}
