import type { ComponentMeta } from "vibestack/stories";
import type { VoiceActivityProps } from "./VoiceActivity.tsx";

export const meta: ComponentMeta<VoiceActivityProps> = {
  args: { shown: "Listening" },
  examples: {
    Thinking: { shown: "Thinking" },
    Speaking: { shown: "Speaking" },
    Retrying: { shown: "Retrying" },
    Failed: { shown: "Failed" },
    Stopping: { shown: "Retiring" },
  },
};
