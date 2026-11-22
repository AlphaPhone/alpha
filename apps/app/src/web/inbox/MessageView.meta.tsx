import type { ComponentMeta } from "vibestack/stories";
import type { MessageViewProps } from "./MessageView.tsx";
import { loadingMessage, openMessage } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<MessageViewProps> = {
  args: {
    reader: openMessage, canMarkRead: true, canChange: true, onBack: none, onReply: none, onChange: none,
    onSetRead: none, onShowImages: none, onPage: none, onAttachment: none, onOpenAttachment: none, onSaveAttachment: none,
    onCloseAttachment: none, onLink: none, onAsk: none,
  },
  examples: { Loading: { reader: loadingMessage }, ReadOnlyAccount: { canMarkRead: false, canChange: false } },
};
