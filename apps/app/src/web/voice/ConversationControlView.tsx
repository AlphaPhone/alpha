// spec/voice/conversation.md, "Story: Start talking only when Alpha can listen safely"; spec/voice/conversation.md, "Story: End voice cleanly, and never lose what I type"; spec/voice/conversation.md, "Network voice listens only after its recipient was disclosed and the owner started it"
import { startable, type Conversation } from "../../../gen/voice__conversation.ts";
import { sendsOf, type Route } from "../../../gen/voice__route.ts";
import { ConversationPanel } from "./ConversationPanel.tsx";
import { noticeText } from "./messages.ts";
import { SpeechDisclosure } from "./SpeechDisclosure.tsx";

/** The conversation as the voice machine holds it, the disclosure waiting for the owner, and the owner's controls. */
export interface ConversationControlViewProps {
  /** The conversation as the voice machine holds it. */
  conversation: Conversation;
  /** The network route whose recipient waits to be disclosed, or undefined when nothing waits. */
  asking: Route | undefined;
  /** Where it is mounted: the dock always offers Talk, the chat shows only the last notice once voice stopped. */
  placement: "dock" | "chat";
  /** The owner pressed Talk. */
  onTalk: () => void;
  /** The owner stops voice; the reply stays whole in the chat. */
  onStop: () => void;
  /** The owner cuts the reply short and keeps talking. */
  onStopSpeaking: () => void;
  /** The owner mutes or unmutes only Alpha's voice. */
  onMute: (muted: boolean) => void;
  /** The owner agreed to the disclosure and starts voice. */
  onContinue: () => void;
  /** The owner closed the disclosure without starting. */
  onDismiss: () => void;
}

/**
 * The conversation voice control: Talk, the disclosure network voice needs first, and the running conversation's controls.
 * @model spec/voice/conversation.md
 */
export function ConversationControlView({ conversation, asking, placement, onTalk, onStop, onStopSpeaking, onMute, onContinue, onDismiss }: ConversationControlViewProps) {
  const notice = noticeText(conversation.notice);
  const panel = <ConversationPanel conversation={conversation} onTalk={onTalk} onStop={onStop} onStopSpeaking={onStopSpeaking} onMute={onMute} />;
  return (
    <>
      {placement === "dock" || !startable(conversation.shown)
        ? panel
        : notice !== undefined && <p role="status" data-voice-notice={conversation.notice} className="px-4 text-sm text-muted-foreground">{notice}</p>}
      <SpeechDisclosure
        route={asking}
        sends={asking === undefined ? undefined : sendsOf(asking)}
        onDismiss={onDismiss}
        onContinue={onContinue}
      />
    </>
  );
}
