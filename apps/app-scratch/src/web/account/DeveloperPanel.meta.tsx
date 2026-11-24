import type { ComponentMeta } from "vibestack/stories";
import type { DeveloperPanelProps } from "./DeveloperPanel.tsx";
import { bridgeAccountChanged, bridgeAllowed, dedicatedBlocked, dedicatedReview } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<DeveloperPanelProps> = {
  args: {
    bridge: bridgeAllowed, dedicated: dedicatedReview, onBridgeSignIn: none, onBridgeCancel: none, onReview: none, onAccept: none,
    onDecline: none, onPoll: none, onFinalize: none,
  },
  examples: { AccountChanged: { bridge: bridgeAccountChanged }, Blocked: { dedicated: dedicatedBlocked } },
};
