// spec/app/voice/index.md, "Story: Hold a spoken conversation"; spec/app/voice/index.md, "Story: Pause for a phone call"
import { Banner, Button, ConfirmDialog, Spinner } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { AudioLines, Keyboard, Mic, MicOff, Square, VolumeX } from "lucide-react";
import type { Machine as Shell } from "../../gen/app__shell.effect.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import type { Machine, Phase } from "../../gen/app__voice.effect.vibe";
import { useMachine } from "../../gen/app__voice.react.ts";
import type { Failure } from "../../gen/app__voice__dictation.ts";
import { untimed } from "../runtime/reactor.vibe";

export interface TalkControlsProps {
  runtime: ManagedRuntime.ManagedRuntime<Machine | Shell, unknown>;
}

const status: Record<Phase, string> = {
  Idle: "",
  Starting: "Connecting to voice…",
  Listening: "Listening…",
  Transcribing: "Transcribing…",
  Thinking: "Thinking…",
  Speaking: "Speaking…",
  Paused: "Voice paused for a phone call",
  Stopping: "Stopping voice…",
  Failed: "",
};

const failure: Record<Failure, string> = {
  NoFailure: "",
  Denied: "Microphone access is off",
  NoMicrophone: "The microphone could not start",
  NoSpeech: "No speech was heard",
  AgentUnavailable: "Alpha could not answer",
  Recognition: "Alpha could not understand the recording",
};

/** The Voice machine's status and the controls it offers while Talk owns the composer. */
export function TalkControls({ runtime }: TalkControlsProps) {
  const { state, can, send } = useMachine(runtime);
  const shell = useShell(runtime);
  if (!state || state.phase === "Idle") return null;
  const decline = { type: "answerDisclosure", agree: false, now: untimed } as const;
  const allow = { ...decline, agree: true } as const;
  const stop = { type: "stop", keyboard: false } as const;
  const type = { ...stop, keyboard: true } as const;
  const mute = { type: state.muted ? "unmute" : "mute" } as const;
  const open = { type: "raise", detent: "Sheet" } as const;
  if (state.phase === "Failed") {
    return (
      <Banner variant="warn" action={
        <>
          {can({ type: "openSettings" }) && <Button size="sm" variant="ghost" onClick={() => void send({ type: "openSettings" })}>Open app settings</Button>}
          {can({ type: "dismiss" }) && <Button size="sm" variant="ghost" onClick={() => void send({ type: "dismiss" })}>Dismiss</Button>}
        </>
      }>{failure[state.failure]}</Banner>
    );
  }
  return (
    <>
      <section aria-label="Voice conversation" className="flex min-h-17 shrink-0 items-center gap-1 rounded-sheet bg-secondary px-2 py-1.5">
        {shell.can(open) && <Button variant="ghost" size="icon" aria-label="Open conversation" onClick={() => void shell.send(open)}><AudioLines className="size-7 text-alpha" /></Button>}
        {can(type) && <Button variant="ghost" size="icon" aria-label="Switch to keyboard" onClick={() => void send(type)}><Keyboard /></Button>}
        <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
          {state.phase === "Starting" || state.phase === "Stopping" ? <Spinner size="sm" aria-hidden /> : shell.can(open) ? null : <AudioLines aria-hidden className="size-7 shrink-0 text-alpha" />}
          <p role="status" className="text-sm text-muted-foreground">{state.muted ? "Microphone muted" : status[state.phase]}</p>
        </div>
        {can({ type: "interrupt" }) && <Button variant="ghost" size="icon" aria-label="Stop speaking" onClick={() => void send({ type: "interrupt" })}><VolumeX /></Button>}
        {can(mute) && <Button variant="ghost" size="icon" aria-pressed={state.muted} aria-label={state.muted ? "Unmute microphone" : "Mute microphone"} onClick={() => void send(mute)}>{state.muted ? <MicOff /> : <Mic />}</Button>}
        {can(stop) && <Button size="icon" className="bg-alpha text-alpha-foreground hover:bg-alpha/90" aria-label="Stop voice conversation" onClick={() => void send(stop)}><Square className="size-2.5" fill="currentColor" /></Button>}
      </section>
      <ConfirmDialog open={state.disclosing} title="Use cloud speech?" confirmLabel="Use cloud speech" cancelLabel="Use on-device speech"
        onConfirm={() => void (can(allow) && send(allow))} onCancel={() => void (can(decline) && send(decline))}>Cloud speech sends microphone audio to Alpha's speech service for this voice conversation.</ConfirmDialog>
    </>
  );
}
