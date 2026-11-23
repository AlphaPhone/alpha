// spec/voice/capture.md, "Story: One voice surface at a time hears me"; spec/voice/listener.md, "Alpha may pause or turn off listening, one action at a time, and never turns it on or resumes it"
import { Effect } from "effect";
import type { AppId } from "../app-screen.ts";
import { useMachine as useCapture } from "../../../gen/voice__capture.react.ts";
import { initial as micInitial } from "../../../gen/voice__capture.ts";
import { useMachine as useConversation } from "../../../gen/voice__conversation.react.ts";
import { initial as conversationInitial } from "../../../gen/voice__conversation.ts";
import { useMachine as useListener } from "../../../gen/voice__listener.react.ts";
import { initial as listenerInitial } from "../../../gen/voice__listener.ts";
import { Listener } from "../../voice/listener.vibe";
import { VoiceIndicatorView } from "./VoiceIndicatorView.tsx";
import { act } from "../shell/services.ts";
import { runtime } from "./runtime.ts";

/** What the shell gives every top surface: a way to open an app. */
export interface VoiceIndicatorProps {
  /** Open an app, at a route inside it. */
  readonly open: (app: AppId, route?: string) => void;
}

/**
 * The voice indicator surface the shell keeps mounted at the top of every screen.
 * @model spec/voice/listener.md
 */
export function VoiceIndicator(_props: VoiceIndicatorProps) {
  const { state: mic = micInitial } = useCapture(runtime);
  const { state: conversation = conversationInitial } = useConversation(runtime);
  const { state: listener = listenerInitial, can } = useListener(runtime);
  return (
    <VoiceIndicatorView
      owner={mic.owner}
      micOpen={mic.open}
      shown={conversation.shown}
      listenerMode={listener.mode}
      listenerMicrophoneOpen={listener.microphoneOpen}
      wakeStop={listener.wakeStop}
      canPause={listener.mode === "ListeningOn" && can({ type: "beginStop", stop: "PauseListening" })}
      onPause={() => { act(Effect.flatMap(Effect.service(Listener), (l) => l.pause())); }}
    />
  );
}
