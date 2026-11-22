// spec/voice/conversation.md, "Story: Start talking only when Alpha can listen safely"; spec/voice/conversation.md, "Story: Mute the speaker without ending voice"; spec/voice/conversation.md, "Story: End voice cleanly, and never lose what I type"
import { AudioLines, Mic, Square, Volume2, VolumeX } from "lucide-react";
import { canMuteSpeaker, canStop, running, startable, type Conversation } from "../../../gen/voice__conversation.ts";
import { Button } from "../components/ui/index.ts";
import { noticeText } from "./messages.ts";
import { VoiceActivity } from "./VoiceActivity.tsx";

export interface ConversationPanelProps {
  /** The conversation as the voice machine holds it. */
  conversation: Conversation;
  /** The owner starts voice. */
  onTalk: () => void;
  /** The owner stops voice; the reply stays whole in the chat. */
  onStop: () => void;
  /** The owner cuts the reply short and keeps talking. */
  onStopSpeaking: () => void;
  /** The owner mutes or unmutes only Alpha's voice. */
  onMute: (muted: boolean) => void;
}

/**
 * The conversation voice control of the assistant dock: Talk, then the phase, Stop, Stop speaking and the speaker's mute, with one line when voice cannot go on.
 * @model spec/voice/conversation.md
 */
export function ConversationPanel({ conversation, onTalk, onStop, onStopSpeaking, onMute }: ConversationPanelProps) {
  const notice = noticeText(conversation.notice);
  const offTalk = startable(conversation.shown);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {offTalk ? (
          <Button size="icon" aria-label="Talk" disabled={conversation.mediaUnconfirmed} onClick={onTalk}>
            <Mic aria-hidden />
          </Button>
        ) : (
          <>
            <VoiceActivity shown={conversation.shown} />
            <span className="flex-1" />
            {conversation.shown === "Speaking" && (
              <Button variant="secondary" size="sm" onClick={onStopSpeaking}>
                <AudioLines aria-hidden />
                Stop speaking
              </Button>
            )}
            {conversation.muteOffered && running(conversation.shown) && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={conversation.muted ? "Unmute Alpha" : "Mute Alpha"}
                aria-pressed={conversation.muted}
                disabled={!canMuteSpeaker(conversation, !conversation.muted)}
                onClick={() => onMute(!conversation.muted)}
              >
                {conversation.muted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
              </Button>
            )}
            <Button variant="outline" size="icon" aria-label="Stop voice" disabled={!canStop(conversation, true)} loading={conversation.shown === "Retiring"} onClick={onStop}>
              <Square aria-hidden />
            </Button>
          </>
        )}
      </div>
      {notice && (
        <p role="status" className="text-muted-foreground">
          {notice}
        </p>
      )}
    </div>
  );
}
