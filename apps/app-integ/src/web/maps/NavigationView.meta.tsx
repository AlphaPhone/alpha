import { fn } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { arrived, guidanceContent, guiding, offRoute } from "./fixtures.ts";
import type { NavigationViewProps } from "./NavigationView.tsx";

export const meta: ComponentMeta<NavigationViewProps> = {
  args: { guidance: guiding, content: guidanceContent, voiceOn: true, voiceAllowed: true, now: 0, onEnd: fn(), onRecenter: fn(), onVoice: fn() },
  examples: {
    OffRoute: { guidance: offRoute },
    Arrived: { guidance: arrived },
    GoogleRoute: { voiceAllowed: false },
    NotFollowing: { guidance: { ...guiding, follow: false } },
  },
};
