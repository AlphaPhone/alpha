import type { ComponentMeta } from "vibestack/stories";
import type { RemindersViewProps } from "./RemindersView.tsx";
import { reminders, ringer, staleReminders } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<RemindersViewProps> = {
  args: {
    reminders, unconfirmed: 0, tapPending: false, now: ringer.now,
    onOpen: none, onBack: none, onRefresh: none, onCreate: none, onContinueCreate: none, onEdit: none, onDecide: none,
    onReopen: none, onDelete: none, onSaveTodo: none, onTodo: none, onOpenTap: none, onDismissTap: none,
  },
  examples: {
    Detail: { openId: "r1" },
    Completed: { openId: "r3" },
    OutOfDate: { reminders: staleReminders, unconfirmed: 2, tapPending: true },
  },
};
