// spec/voice/conversation.md, "Story: Start talking only when Alpha can listen safely"; spec/voice/conversation.md, "Story: End voice cleanly, and never lose what I type"
import { Effect } from "effect";
import { useState } from "react";
import { useMachine } from "../../../gen/voice__conversation.react.ts";
import { disclosedFor, initial } from "../../../gen/voice__conversation.ts";
import { sendsOf, type Route } from "../../../gen/voice__route.ts";
import { VoiceConversation, type VoiceStart } from "../../voice/conversation.vibe";
import { ConversationPanel } from "./ConversationPanel.tsx";
import { SpeechDisclosure } from "./SpeechDisclosure.tsx";
import { act, readNow } from "../shell/services.ts";
import { runtime } from "./runtime.ts";

/** What the screen admits when voice starts and the conversation its turns go to. */
export type ConversationControlProps = VoiceStart;

/**
 * The conversation voice control the assistant dock mounts: Talk, the disclosure network voice needs first, and the running conversation's controls.
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
    <>
      <ConversationPanel
        conversation={state}
        onTalk={talk}
        onStop={() => run((c) => c.stop())}
        onStopSpeaking={() => run((c) => c.stopSpeaking())}
        onMute={(muted) => run((c) => c.mute(muted))}
      />
      <SpeechDisclosure
        route={asking}
        sends={asking === undefined ? undefined : sendsOf(asking)}
        onDismiss={() => setAsking(undefined)}
        onContinue={() => {
          setAsking(undefined);
          run((c) => Effect.andThen(c.disclose(), c.start(start)));
        }}
      />
    </>
  );
}
