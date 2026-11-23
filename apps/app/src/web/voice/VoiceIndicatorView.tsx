// spec/voice/capture.md, "Story: One voice surface at a time hears me"; spec/voice/listener.md, "Story: See and stop what the listener is doing"; spec/voice/listener.md, "The startup stop is confirmed only by an off reply, within five seconds, with the microphone closed"
import { AudioLines, Ear, Mic, Pause, ShieldAlert } from "lucide-react";
import type { Shown } from "../../../gen/voice__conversation.ts";
import type { MicOwner } from "../../../gen/voice__capture.ts";
import type { ListenerMode, WakeStop } from "../../../gen/voice__listener.ts";
import { Button } from "../components/ui/index.ts";
import { listenerLabel } from "./messages.ts";

/** Who has the microphone, what voice and the listener are doing, and the Pause the owner may use. */
export interface VoiceIndicatorViewProps {
  /** Who holds the renderer's microphone. */
  owner: MicOwner;
  /** Whether the renderer's capture is open. */
  micOpen: boolean;
  /** What the conversation shows. */
  shown: Shown;
  /** The always-on listener, as it last answered; "Unavailable" off the Alpha image. */
  listenerMode: ListenerMode;
  /** Whether the listener still holds the microphone. */
  listenerMicrophoneOpen: boolean;
  /** The startup stop of a listener the image does not admit. */
  wakeStop: WakeStop;
  /** Pause is offered while the listener listens and no action runs. */
  canPause: boolean;
  /** The owner pauses the listener until they resume it in its own screen. */
  onPause: () => void;
}

/**
 * The top of every screen: a dot while anything has the microphone, the listener's state on the Alpha image, and a warning when a listener left on could not be confirmed off.
 * @model spec/voice/listener.md
 */
export function VoiceIndicatorView({ owner, micOpen, shown, listenerMode, listenerMicrophoneOpen, wakeStop, canPause, onPause }: VoiceIndicatorViewProps) {
  const listening = listenerMode === "ListeningOn" || listenerMicrophoneOpen;
  if (!micOpen && shown !== "Speaking" && !listening && listenerMode === "Unavailable" && wakeStop !== "StopUnconfirmed") return null;
  return (
    <div className="flex items-center gap-2 px-3 py-1">
      {micOpen && (
        <span role="img" aria-label={owner === "DictationCapture" ? "Dictation is recording" : "Voice is listening"} className="flex items-center text-primary">
          <Mic aria-hidden className="size-4" />
        </span>
      )}
      {shown === "Speaking" && (
        <span role="img" aria-label="Alpha is speaking" className="flex items-center text-primary">
          <AudioLines aria-hidden className="size-4" />
        </span>
      )}
      {listenerMode !== "Unavailable" && (
        <span role="img" aria-label={listenerLabel(listenerMode, listenerMicrophoneOpen)} className={listening ? "flex items-center text-primary" : "flex items-center text-muted-foreground"}>
          <Ear aria-hidden className="size-4" />
        </span>
      )}
      {canPause && (
        <Button variant="ghost" size="sm" aria-label="Pause listening" onClick={onPause}>
          <Pause aria-hidden />
        </Button>
      )}
      {wakeStop === "StopUnconfirmed" && (
        <p role="alert" className="flex items-center gap-1 text-warn">
          <ShieldAlert aria-hidden className="size-4" />
          Wake listening could not be confirmed off. Turn it off in Android settings.
        </p>
      )}
    </div>
  );
}
