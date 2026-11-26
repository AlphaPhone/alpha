// spec/app/voice/index.md, "Story: Hold a spoken conversation"; spec/app/voice/index.md, "A reply that needs the owner's review in chat keeps voice listening with the microphone open"; spec/app/voice/index.md, "Story: Pause for a phone call"; spec/app/voice/index.md, "A failed conversation ends quietly: why it failed is kept only until voice returns to idle, and nothing is shown"; spec/app/voice/index.md, "Speaker mute is offered after the current speech bridge confirms gain control"
import { Button, ConfirmDialog, cn } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import type { ReactNode } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import type { Machine as Shell } from "../../gen/app__shell.effect.vibe";
import { useMachine as useShell } from "../../gen/app__shell.react.ts";
import { Machine } from "../../gen/app__voice.effect.vibe";
import { useMachine } from "../../gen/app__voice.react.ts";
import { micHeld, type Phase } from "../../gen/app__voice.ts";
import { untimed } from "../runtime/reactor.vibe";
import { VoiceStopIcon } from "./VoiceStopIcon.tsx";
import { VoiceWaveform } from "./VoiceWaveform.tsx";

export interface TalkControlsProps {
  runtime: ManagedRuntime.ManagedRuntime<Machine | Shell, unknown>;
  trailing?: ReactNode;
  compact?: boolean;
}

const spoken: Record<Phase | "Muted", string> = {
  Idle: "", Starting: "Connecting to voice", Listening: "Listening", Transcribing: "Transcribing", Thinking: "Thinking",
  Speaking: "Speaking", Stopping: "Stopping voice", Failed: "", Muted: "Microphone muted",
};

/**
 * The controls the Voice machine offers while Talk owns the composer, copied from the Sunday demo build the owner approved
 * (v119, old-line Alpha 45f6bed30): the sheet's voice composer (apps/app/src/prototype/template.html:4730-4737; phone.css:856
 * 68px row, 6px gap, 6px 6px 6px 20px padding, 28px corners; phone.css:870-871 48px controls and the accent Stop) and the
 * pill's voice controls (template.html:4831-4838, phone.css:875-880). The row holds only the phase motion, the speaker,
 * the microphone and Stop: v119 has no keyboard control in Talk. Stop speaking is offered only where the speech bridge
 * gives no speaker control (voice-adapter.ts:1117); the speaker control stands dimmed while Talk starts and while its
 * first receipt is awaited (voice-adapter.ts:1120-1121, speakerMuteDisabled while starting or pending; demo frame v89-064);
 * the microphone control stays in place, dimmed, while it cannot act (voice-adapter.ts:1631-1633, phone.css:920), and
 * while Alpha answers with the microphone really closed it shows it paused, as v119 did only while its input was held
 * (voice-adapter.ts:1116-1118; demo frames v89-072, v89-076), as the Cloud relay holds it through the reply; once the
 * phone's own recognizer opens it again while Alpha speaks it shows it open and mutes it, as v119 offered Mute whenever input was not held (voice-adapter.ts:1117, 1631); Stop is always
 * there. While Talk connects the 18px ring turns in place of the motion (voice-adapter.ts:1646-1650,
 * phone.css:1075-1083). v119 also wrote the phase in words ("Connecting…", "Listening", "Voice stopped",
 * voice-adapter.ts:1646); the owner's rule removes every voice status word, so the phase name is read to assistive
 * technology only, as v119's pill did (phone.css:1081).
 */
export function TalkControls({ runtime, trailing, compact = false }: TalkControlsProps) {
  const { state, can, send } = useMachine(runtime);
  const shell = useShell(runtime);
  if (!state || state.phase === "Idle" || state.phase === "Failed") return null;
  const decline = { type: "answerDisclosure", agree: false, now: untimed } as const;
  const allow = { ...decline, agree: true } as const;
  const stop = { type: "stop", keyboard: false } as const;
  const mute = { type: state.muted ? "unmute" : "mute" } as const;
  const open = { type: "raise", detent: "Sheet" } as const;
  const connecting = state.phase === "Starting";
  const phase = state.muted ? "Muted" : state.phase;
  const canMute = can(mute);
  const unconfirmed = connecting || state.phase === "Stopping";
  const speakerMuted = state.speaker === "SpeakerOff" || state.speaker === "SpeakerUnmuting";
  const speakerConfirmed = speakerMuted || state.speaker === "SpeakerOn" || state.speaker === "SpeakerMuting";
  const speakerWaits = !speakerConfirmed && (connecting || state.speaker === "SpeakerChecking");
  const held = !unconfirmed && micHeld(state);
  const setSpeaker = { type: "setSpeakerMuted", muted: !speakerMuted } as const;
  const spinner = <span aria-hidden="true" className="size-4.5 shrink-0 rounded-full border-2 border-border border-t-alpha motion-safe:animate-spin" style={{ animationDuration: "900ms" }} />;
  const activity = <VoiceWaveform phase={phase} compact={compact} />;
  const review = state.reviewPending && state.phase === "Listening";
  const status = (
    <p role="status" aria-label={compact ? undefined : "Voice conversation status"} className="sr-only">
      {review ? "Review in chat" : spoken[phase]}
    </p>
  );
  return (
    <>
      <section aria-label="Voice conversation" data-alpha-pill-voice={compact ? "" : undefined}
        className={cn("flex shrink-0 items-center bg-secondary",
          compact ? "gap-0.5 self-center rounded-dock-compact p-1.25 shadow-dock-compact dark:shadow-dock-compact-dark"
            : "min-h-17 gap-1.5 rounded-sheet py-1.5 pr-1.5 pl-5 [&>button]:size-12")}>
        {compact && shell.can(open) && <Button variant="ghost" size="icon" aria-label="Open conversation" onClick={() => void shell.send(open)}>
          {connecting ? spinner : activity}
        </Button>}
        {compact ? status : (
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            {status}
            {connecting ? spinner : activity}
          </div>
        )}
        {!speakerConfirmed && !speakerWaits && can({ type: "interrupt" }) && <Button variant="ghost" size="icon" aria-label="Stop speaking" onClick={() => void send({ type: "interrupt" })}><VolumeX /></Button>}
        {(speakerConfirmed || speakerWaits) && <Button variant="ghost" size="icon" className="disabled:opacity-35" disabled={speakerWaits || !can(setSpeaker)} aria-pressed={speakerMuted}
          aria-label={speakerMuted ? "Unmute speaker" : "Mute speaker"} onClick={() => void send(setSpeaker)}>
          {speakerMuted ? <VolumeX /> : <Volume2 />}
        </Button>}
        <Button variant="ghost" size="icon" className="disabled:opacity-35" disabled={!canMute} aria-pressed={unconfirmed ? "mixed" : state.muted || held}
          aria-label={unconfirmed ? "Microphone status unconfirmed" : canMute ? (state.muted ? "Unmute microphone" : "Mute microphone") : state.muted ? "Microphone off"
            : held ? "Microphone paused while Alpha responds" : "Microphone control unavailable"}
          onClick={() => void send(mute)}>
          {state.muted || held ? <MicOff /> : <Mic />}
        </Button>
        <Button size="icon" className="bg-alpha text-alpha-foreground hover:bg-alpha/90" disabled={!can(stop)} aria-label="Stop voice conversation" onClick={() => void send(stop)}>
          <VoiceStopIcon />
        </Button>
        {trailing}
      </section>
      <ConfirmDialog open={state.disclosing} title="Use cloud speech?" confirmLabel="Use cloud speech" cancelLabel="Use on-device speech"
        onConfirm={() => void (can(allow) && send(allow))} onCancel={() => void (can(decline) && send(decline))}>Cloud speech sends microphone audio to Alpha's speech service for this voice conversation.</ConfirmDialog>
    </>
  );
}
