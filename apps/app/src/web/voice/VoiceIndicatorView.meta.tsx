import type { ComponentMeta } from "vibestack/stories";
import type { VoiceIndicatorViewProps } from "./VoiceIndicatorView.tsx";

const noop = () => {};

export const meta: ComponentMeta<VoiceIndicatorViewProps> = {
  args: { owner: "NoOwner", micOpen: false, shown: "Off", listenerMode: "Unavailable", listenerMicrophoneOpen: false, wakeStop: "StopNotNeeded", canPause: false, onPause: noop },
  examples: {
    Dictating: { owner: "DictationCapture", micOpen: true },
    Speaking: { owner: "AssistantCapture", micOpen: true, shown: "Speaking" },
    ListenerOn: { listenerMode: "ListeningOn", canPause: true },
    ListenerHoldsMicrophone: { listenerMode: "ListeningPaused", listenerMicrophoneOpen: true },
    WakeStopUnconfirmed: { wakeStop: "StopUnconfirmed" },
  },
};
