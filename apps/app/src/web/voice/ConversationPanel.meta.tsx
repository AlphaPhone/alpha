import type { ComponentMeta } from "vibestack/stories";
import { initial } from "../../../gen/voice__conversation.ts";
import type { ConversationPanelProps } from "./ConversationPanel.tsx";
import { failed, listening, refusedForCall, retrying, speakingMuted, stopUnconfirmed, takingTurns } from "./fixtures.ts";

const noop = () => {};

export const meta: ComponentMeta<ConversationPanelProps> = {
  args: { conversation: initial, onTalk: noop, onStop: noop, onStopSpeaking: noop, onMute: noop },
  examples: {
    Listening: { conversation: listening },
    SpeakingMuted: { conversation: speakingMuted },
    TakingTurns: { conversation: takingTurns },
    RefusedForCall: { conversation: refusedForCall },
    StopUnconfirmed: { conversation: stopUnconfirmed },
    Retrying: { conversation: retrying },
    Failed: { conversation: failed },
  },
};
