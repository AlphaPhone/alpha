import type { ComponentMeta } from "vibestack/stories";
import type { EmailCardViewProps } from "./EmailCardView.tsx";
import { agentCard } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<EmailCardViewProps> = {
  args: { card: agentCard, onEdit: none, onSend: none, onDecline: none },
  examples: { Sent: { card: { ...agentCard, phase: "CardSent" } }, Uncertain: { card: { ...agentCard, phase: "CardUncertain" } } },
};
