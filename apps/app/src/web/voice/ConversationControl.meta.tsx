import type { ComponentMeta } from "vibestack/stories";
import type { ConversationControlProps } from "./ConversationControl.tsx";

export const meta: ComponentMeta<ConversationControlProps> = {
  args: { admitted: true, callActive: false, conversationId: "fixture-conversation", roomId: "fixture-room", chatCurrent: () => true },
};
