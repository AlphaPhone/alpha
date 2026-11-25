// spec/agent/index.md, "Story: Run Alpha's agent on the phone"
import type { AgentPlugin, LocalRoute } from "@elizaos/agent-host";

/** Alarm chime tone identifiers shared with the Clock app. */
export type ClockSound = "radar" | "chime" | "pulse" | "gentle" | "classic";

/** Runtime phase of an alarm. */
export type ClockAlarmPhase = "idle" | "ringing" | "snoozed";

/** One persisted alarm record exchanged between the Clock app and the resident agent. */
export interface ClockAlarmRecord {
  readonly id: string;
  readonly hour: number;
  readonly minute: number;
  readonly daysMask: number;
  readonly label: string;
  readonly sound: ClockSound;
  readonly vibrate: boolean;
  readonly enabled: boolean;
  readonly snoozeMinutes: number;
  readonly phase: ClockAlarmPhase;
  readonly fireAtMs: number | null;
  readonly snoozeUntilMs: number | null;
  readonly missed: boolean;
  readonly revision: number;
  readonly updatedAtMs: number;
}

/** Runtime status of a countdown timer. */
export type ClockTimerStatus = "ready" | "running" | "paused" | "ringing";

/** One persisted timer record exchanged between the Clock app and the resident agent. */
export interface ClockTimerRecord {
  readonly id: string;
  readonly label: string;
  readonly durationMs: number;
  readonly remainingMs: number;
  readonly status: ClockTimerStatus;
  readonly startedAtMs: number | null;
  readonly endAtMs: number | null;
  readonly ringStartedAtMs: number | null;
  readonly revision: number;
  readonly updatedAtMs: number;
}

/** One pinned world clock city exchanged between the Clock app and the resident agent. */
export interface WorldCityRecord {
  readonly id: string;
  readonly city: string;
  readonly region: string;
  readonly timeZone: string;
  readonly order: number;
}

/** Full synchronized Clock state snapshot. */
export interface ClockSnapshot {
  readonly version: number;
  readonly updatedAtMs: number;
  readonly alarms: readonly ClockAlarmRecord[];
  readonly timers: readonly ClockTimerRecord[];
  readonly world: readonly WorldCityRecord[];
  readonly deletedAlarmIds: readonly string[];
  readonly deletedTimerIds: readonly string[];
}

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

/** Action definition derived from eliza's AgentPlugin contract. */
export type AgentAction = NonNullable<AgentPlugin["actions"]>[number];

/** Provider definition derived from eliza's AgentPlugin contract. */
export type AgentProvider = NonNullable<AgentPlugin["providers"]>[number];

/** View declaration derived from eliza's AgentPlugin contract. */
export type AgentView = NonNullable<AgentPlugin["views"]>[number];

/** Runtime parameter of an action handler. */
export type AgentRuntimeLike = Parameters<AgentAction["handler"]>[0];

/** Route definition derived from eliza's agent routes contract. */
export type AgentRoute = LocalRoute;

/** Minimal interface for the notification runtime service when registered. */
export interface NotificationServiceLike {
  notify(input: {
    readonly title: string;
    readonly body?: string;
    readonly category: string;
    readonly source: string;
    readonly groupKey?: string;
    readonly data?: Record<string, unknown>;
  }): Promise<unknown>;
}

/** Narrow an unknown value to a plain key-value record. */
export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** Read a trimmed non-empty string field, or undefined. */
export function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

/** Read a string field (including empty string), or undefined. */
export function readRawString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

/** Read a finite number field, or undefined. */
export function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Read a boolean field, or undefined. */
export function readBoolean(record: Record<string, unknown>, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === "boolean" ? value : undefined;
}
