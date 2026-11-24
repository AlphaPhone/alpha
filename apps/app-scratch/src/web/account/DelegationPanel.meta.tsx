import type { ComponentMeta } from "vibestack/stories";
import type { DelegationPanelProps } from "./DelegationPanel.tsx";
import { delegationConnected, delegationDetails, delegationWaiting } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<DelegationPanelProps> = {
  args: { delegation: delegationWaiting, details: delegationDetails, onStart: none, onCheck: none, onCancel: none, onReviewRemoval: none, onRetryDisconnect: none },
  examples: { Connected: { delegation: delegationConnected }, DisconnectPending: { delegation: delegationConnected, details: { ...delegationDetails, pendingRevocations: ["grant-0"] } } },
};
