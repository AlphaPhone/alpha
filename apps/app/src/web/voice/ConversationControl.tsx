// spec/voice/conversation.md, "Story: Start talking only when Alpha can listen safely"; spec/voice/conversation.md, "Story: End voice cleanly, and never lose what I type"
import { Effect } from "effect";
import { useState } from "react";
import { useMachine } from "../../../gen/voice__conversation.react.ts";
import { disclosedFor, initial } from "../../../gen/voice__conversation.ts";
import { sendsOf, type Route } from "../../../gen/voice__route.ts";
import { VoiceConversation, type VoiceStart } from "../../voice/conversation.vibe";
import { ConversationPanel } from "./ConversationPanel.tsx";
import { SpeechDisclosure } from "./SpeechDisclosure.tsx";
import { readVoice, runVoice, useVoiceRuntime, type VoiceRuntime } from "./runtime.tsx";

export type ConversationControlProps = VoiceStart;

function Connected({ runtime, start }: { runtime: VoiceRuntime; start: VoiceStart }) {
  const { state = initial } = useMachine(runtime);
  const [asking, setAsking] = useState<Route | undefined>(undefined);
  const conversation = Effect.service(VoiceConversation);
  const talk = () => {
    const route = readVoice(runtime, Effect.flatMap(conversation, (c) => c.route()));
    if (!disclosedFor(state, route)) setAsking(route);
    else runVoice(runtime, Effect.flatMap(conversation, (c) => c.start(start)));
  };
  return (
    <>
      <ConversationPanel
        conversation={state}
        onTalk={talk}
        onStop={() => runVoice(runtime, Effect.flatMap(conversation, (c) => c.stop()))}
        onStopSpeaking={() => runVoice(runtime, Effect.flatMap(conversation, (c) => c.stopSpeaking()))}
        onMute={(muted) => runVoice(runtime, Effect.flatMap(conversation, (c) => c.mute(muted)))}
      />
      <SpeechDisclosure
        route={asking}
        sends={asking === undefined ? undefined : sendsOf(asking)}
        onDismiss={() => setAsking(undefined)}
        onContinue={() => {
          setAsking(undefined);
          runVoice(runtime, Effect.flatMap(conversation, (c) => Effect.andThen(c.disclose(), c.start(start))));
        }}
      />
    </>
  );
}

/**
 * The conversation voice control the assistant dock mounts: Talk, the disclosure network voice needs first, and the running conversation's controls.
 * @model spec/voice/conversation.md
 */
export function ConversationControl(props: ConversationControlProps) {
  const runtime = useVoiceRuntime();
  return runtime === undefined ? null : <Connected runtime={runtime} start={props} />;
}
