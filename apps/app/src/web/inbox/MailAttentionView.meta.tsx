import type { ComponentMeta } from "vibestack/stories";
import type { MailAttentionViewProps } from "./MailAttentionView.tsx";

export const meta: ComponentMeta<MailAttentionViewProps> = {
  args: { attention: { phase: "AttentionReady", unread: 3, more: false }, onOpen: () => undefined },
  examples: {
    MoreBeyond: { attention: { phase: "AttentionReady", unread: 50, more: true } },
    NothingUnread: { attention: { phase: "AttentionReady", unread: 0, more: false } },
    Loading: { attention: { phase: "AttentionLoading", unread: 0, more: false } },
    Failed: { attention: { phase: "AttentionError", unread: 0, more: false } },
  },
};
