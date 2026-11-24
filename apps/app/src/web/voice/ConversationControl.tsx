// spec/voice/conversation.md, "Story: Start talking only when Alpha can listen safely"; spec/voice/conversation.md, "Story: End voice cleanly, and never lose what I type"
import { Effect } from "effect";
import { useState, type ReactNode } from "react";
import { useMachine } from "../../../gen/voice__conversation.react.ts";
import { disclosedFor, initial } from "../../../gen/voice__conversation.ts";
import type { Route } from "../../../gen/voice__route.ts";
import { VoiceConversation, type VoiceStart } from "../../voice/conversation.vibe";
import { ConversationControlView } from "./ConversationControlView.tsx";
import { act, readNow } from "../shell/services.ts";
import { runtime } from "./runtime.ts";

/** What the screen admits when voice starts and the conversation its turns go to. */
export type ConversationControlProps = VoiceStart;

/**
 * The conversation voice control the assistant dock mounts, over the runtime: Talk, the disclosure network voice needs first, and the running conversation's controls.
 * @model spec/voice/conversation.md
 */
export function ConversationControl(start: ConversationControlProps) {
  const { state = initial } = useMachine(runtime);
  const [asking, setAsking] = useState<Route | undefined>(undefined);
  const conversation = Effect.service(VoiceConversation);
  const run = (work: (c: VoiceConversation.Shape) => Effect.Effect<unknown>) => { act(Effect.flatMap(conversation, work)); };
  const talk = () => {
    const route = readNow(Effect.flatMap(conversation, (c) => c.route()));
    if (!disclosedFor(state, route)) setAsking(route);
    else run((c) => c.start(start));
  };
  return (
    <ConversationControlView
      conversation={state}
      asking={asking}
      placement="dock"
      onTalk={talk}
      onStop={() => run((c) => c.stop())}
      onStopSpeaking={() => run((c) => c.stopSpeaking())}
      onMute={(muted) => run((c) => c.mute(muted))}
      onDismiss={() => setAsking(undefined)}
      onContinue={() => {
        setAsking(undefined);
        run((c) => Effect.andThen(c.disclose(), c.start(start)));
      }}
    />
  );
}

/** Talk for a host that asks the shell to start voice, and what it shows: the running conversation, its last notice, and the disclosure. */
export interface VoiceTalk {
  /** The owner pressed Talk: the disclosure first on an undisclosed network route, else `request`. */
  talk: () => void;
  /** The running conversation's controls, or its last notice once it stopped, and the disclosure sheet. */
  view: ReactNode;
}

/**
 * Talk in the chat: network voice is disclosed once before it listens, then `request` asks the shell to start voice with the
 * screen's own facts; while voice runs its Stop, Stop speaking and Mute show here.
 * @model spec/voice/conversation.md
 */
export function useVoiceTalk(request: () => void): VoiceTalk {
  const { state = initial } = useMachine(runtime);
  const [asking, setAsking] = useState<Route | undefined>(undefined);
  const conversation = Effect.service(VoiceConversation);
  const run = (work: (c: VoiceConversation.Shape) => Effect.Effect<unknown>) => { act(Effect.flatMap(conversation, work)); };
  const talk = () => {
    const route = readNow(Effect.flatMap(conversation, (c) => c.route()));
    if (!disclosedFor(state, route)) setAsking(route);
    else request();
  };
  const view = (
    <ConversationControlView
      conversation={state}
      asking={asking}
      placement="chat"
      onTalk={talk}
      onStop={() => run((c) => c.stop())}
      onStopSpeaking={() => run((c) => c.stopSpeaking())}
      onMute={(muted) => run((c) => c.mute(muted))}
      onDismiss={() => setAsking(undefined)}
      onContinue={() => {
        setAsking(undefined);
        run((c) => Effect.andThen(c.disclose(), Effect.sync(request)));
      }}
    />
  );
  return { talk, view };
}
