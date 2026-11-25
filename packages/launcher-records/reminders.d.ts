/** Semantic accent color identifiers for reminder lists. */
export type ReminderListColor = "accent" | "blue" | "green" | "amber" | "rose" | "violet";

/** Icon identifiers for reminder lists. */
export type ReminderListIcon = "list" | "home" | "work" | "shopping" | "heart" | "star" | "bookmark" | "bolt";

/** Recurrence rules for reminders. */
export type ReminderRecurrence = "none" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly";

/** Priority levels for reminders. */
export type ReminderPriority = "none" | "low" | "medium" | "high";

/** One persisted reminder list. */
export interface ReminderListRecord {
  readonly id: string;
  readonly name: string;
  readonly color: ReminderListColor;
  readonly icon: ReminderListIcon;
  readonly isDefault: boolean;
  readonly order: number;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
}

/** One checklist subtask belonging to a reminder. */
export interface ReminderSubtaskRecord {
  readonly id: string;
  readonly title: string;
  readonly done: boolean;
}

/** One persisted reminder item exchanged between the Reminders app and the resident agent. */
export interface ReminderItemRecord {
  readonly id: string;
  readonly listId: string;
  readonly title: string;
  readonly notes: string;
  readonly dueDate: string | null;
  readonly dueMinute: number | null;
  readonly alertMinutes: number | null;
  readonly recurrence: ReminderRecurrence;
  readonly priority: ReminderPriority;
  readonly flagged: boolean;
  readonly subtasks: readonly ReminderSubtaskRecord[];
  readonly completed: boolean;
  readonly completedAtMs: number | null;
  readonly snoozedUntilMs: number | null;
  readonly notifiedAtMs: number | null;
  readonly agentTaskId: string | null;
  readonly revision: number;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
}

/** Full synchronized Reminders state snapshot. */
export interface RemindersSnapshot {
  readonly version: number;
  readonly updatedAtMs: number;
  readonly lists: readonly ReminderListRecord[];
  readonly items: readonly ReminderItemRecord[];
}
