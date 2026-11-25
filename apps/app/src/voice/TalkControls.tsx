// spec/app/voice/index.md, "Story: Hold a spoken conversation"; spec/app/voice/index.md, "Story: Pause for a phone call"; spec/app/voice/index.md, "A failed conversation ends quietly: why it failed is kept only until voice returns to idle, and nothing is shown"
import { Button, ConfirmDialog, Spinner } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import type { ReactNode } from "react";
import { AudioLines, Keyboard, Mic, MicOff, Square, VolumeX } from "lucide-react";
import type { Machine as Shell } from "../../gen/app__shell.effect.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import type { Machine, Phase } from "../../gen/app__voice.effect.vibe";
import { useMachine } from "../../gen/app__voice.react.ts";
import { untimed } from "../runtime/reactor.vibe";

export interface TalkControlsProps {
  runtime: ManagedRuntime.ManagedRuntime<Machine | Shell, unknown>;
  trailing?: ReactNode;
}

/** What a screen reader is told of each phase; it is never drawn. */
const announced: Record<Phase, string> = {
  Idle: "", Starting: "Connecting to voice", Listening: "Listening", Transcribing: "Transcribing", Thinking: "Thinking",
  Speaking: "Speaking", Paused: "Voice paused for a phone call", Stopping: "Stopping voice", Failed: "",
};

/** The controls the Voice machine offers while Talk owns the composer: its state shows in icons, and in words only to a screen reader, and a failed conversation shows nothing. */
export function TalkControls({ runtime, trailing }: TalkControlsProps) {
  const { state, can, send } = useMachine(runtime);
  const shell = useShell(runtime);
  if (!state || state.phase === "Idle" || state.phase === "Failed") return null;
  const decline = { type: "answerDisclosure", agree: false, now: untimed } as const;
  const allow = { ...decline, agree: true } as const;
  const stop = { type: "stop", keyboard: false } as const;
  const type = { ...stop, keyboard: true } as const;
  const mute = { type: state.muted ? "unmute" : "mute" } as const;
  const open = { type: "raise", detent: "Sheet" } as const;
  return (
    <>
      <section aria-label="Voice conversation" className="flex min-h-17 shrink-0 items-center gap-1 rounded-sheet bg-secondary px-2 py-1.5">
        {shell.can(open) && <Button variant="ghost" size="icon" aria-label="Open conversation" onClick={() => void shell.send(open)}><AudioLines className="size-7 text-alpha" /></Button>}
        {can(type) && <Button variant="ghost" size="icon" aria-label="Switch to keyboard" onClick={() => void send(type)}><Keyboard /></Button>}
        <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
          {state.phase === "Starting" || state.phase === "Stopping" ? <Spinner size="sm" aria-hidden /> : shell.can(open) ? null : <AudioLines aria-hidden className="size-7 shrink-0 text-alpha" />}
          <p role="status" className="sr-only">{state.muted ? "Microphone muted" : announced[state.phase]}</p>
        </div>
        {can({ type: "interrupt" }) && <Button variant="ghost" size="icon" aria-label="Stop speaking" onClick={() => void send({ type: "interrupt" })}><VolumeX /></Button>}
        {can(mute) && <Button variant="ghost" size="icon" aria-pressed={state.muted} aria-label={state.muted ? "Unmute microphone" : "Mute microphone"} onClick={() => void send(mute)}>{state.muted ? <MicOff /> : <Mic />}</Button>}
        {can(stop) && <Button size="icon" className="bg-alpha text-alpha-foreground hover:bg-alpha/90" aria-label="Stop voice conversation" onClick={() => void send(stop)}><Square className="size-2.5" fill="currentColor" /></Button>}
        {trailing}
      </section>
      <ConfirmDialog open={state.disclosing} title="Use cloud speech?" confirmLabel="Use cloud speech" cancelLabel="Use on-device speech"
        onConfirm={() => void (can(allow) && send(allow))} onCancel={() => void (can(decline) && send(decline))}>Cloud speech sends microphone audio to Alpha's speech service for this voice conversation.</ConfirmDialog>
    </>
  );
}
