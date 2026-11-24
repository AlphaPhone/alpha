import type { ComponentMeta } from "vibestack/stories";
import type { AssistantDraftCardProps } from "./AssistantDraftCard.tsx";

export const meta: ComponentMeta<AssistantDraftCardProps> = {
  args: { to: "Ana Lima", subject: "Friday lunch", body: "Friday works. Shall we say 12:30 at Cais?\n\nI can book the table." },
  examples: { "No subject": { subject: undefined } },
};
