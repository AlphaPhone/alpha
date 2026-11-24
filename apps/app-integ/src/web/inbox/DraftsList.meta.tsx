import type { ComponentMeta } from "vibestack/stories";
import type { DraftsListProps } from "./DraftsList.tsx";
import { workDrafts } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<DraftsListProps> = {
  args: { drafts: workDrafts, gmailDrafts: [{ draftId: "g1", messageId: "m9", subject: "Plan", recipients: ["cy@example.com"], snippet: "Draft", updatedAt: "" }], localOnly: false, onOpenLocal: none, onOpenGmail: none, onDelete: none },
  examples: { LocalOnly: { localOnly: true } },
};
