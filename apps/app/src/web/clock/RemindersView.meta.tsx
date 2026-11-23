import type { ComponentMeta } from "vibestack/stories";
import type { RemindersViewProps } from "./RemindersView.tsx";
import { initial as page } from "../../../gen/clock__reminderPage.ts";
import { detailPage, editPage, keptDraft, reminders, reopenPage, ringer, savingReminders, staleReminders } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<RemindersViewProps> = {
  args: {
    reminders, page, unconfirmed: 0, tapPending: false, now: ringer.now, discarding: false, onKeep: none, onDiscard: none, onDiscardAnswer: none,
    onOpen: none, onOpenForm: none, onCloseForm: none, onAskReopen: none, onCloseReopen: none, onBack: none, onRefresh: none, onCreate: none, onContinueCreate: none, onEdit: none, onDecide: none,
    onReopen: none, onDelete: none, onSaveTodo: none, onTodo: none, onOpenTap: none, onDismissTap: none,
  },
  examples: {
    Detail: { page: detailPage("r1") },
    Completed: { page: detailPage("r3") },
    ReopenQuestion: { page: reopenPage },
    Editing: { page: editPage },
    OutOfDate: { reminders: staleReminders, unconfirmed: 2, tapPending: true },
    KeptDraft: { keptNew: keptDraft },
    KeptEdit: { page: detailPage("r1"), keptEdit: { id: "r1", revision: "v1", draft: keptDraft } },
    Discarding: { keptNew: keptDraft, discarding: true },
    Saving: { reminders: savingReminders },
  },
};
