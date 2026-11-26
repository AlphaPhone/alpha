// spec/agent/index.md, "Story: Run Alpha's agent on the phone"
import type { AgentPlugin, LocalRoute } from "@elizaos/agent-host";

interface Revisioned {
  readonly revision: number;
  readonly updatedAtMs: number;
}

interface EntityClock {
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
}

interface SnapshotEnvelope {
  readonly version: number;
  readonly updatedAtMs: number;
}

/** Alarm chime tone identifiers shared with the Clock app. */
export type ClockSound = "radar" | "chime" | "pulse" | "gentle" | "classic";

/** Runtime phase of an alarm. */
export type ClockAlarmPhase = "idle" | "ringing" | "snoozed";

/** One persisted alarm record exchanged between the Clock app and the resident agent. */
export interface ClockAlarmRecord extends Revisioned {
  readonly id: string;
  readonly label: string;
  readonly hour: number;
  readonly minute: number;
  readonly daysMask: number;
  readonly sound: ClockSound;
  readonly vibrate: boolean;
  readonly enabled: boolean;
  readonly snoozeMinutes: number;
  readonly phase: ClockAlarmPhase;
  readonly fireAtMs: number | null;
  readonly snoozeUntilMs: number | null;
  readonly missed: boolean;
}

/** Runtime status of a countdown timer. */
export type ClockTimerStatus = "ready" | "running" | "paused" | "ringing";

/** One persisted timer record exchanged between the Clock app and the resident agent. */
export interface ClockTimerRecord extends Revisioned {
  readonly id: string;
  readonly label: string;
  readonly status: ClockTimerStatus;
  readonly durationMs: number;
  readonly remainingMs: number;
  readonly startedAtMs: number | null;
  readonly endAtMs: number | null;
  readonly ringStartedAtMs: number | null;
}

/** One pinned world clock city exchanged between the Clock app and the resident agent. */
export interface WorldCityRecord {
  readonly id: string;
  readonly timeZone: string;
  readonly city: string;
  readonly region: string;
  readonly order: number;
}

/** Full synchronized Clock state snapshot. */
export interface ClockSnapshot extends SnapshotEnvelope {
  readonly alarms: readonly ClockAlarmRecord[];
  readonly timers: readonly ClockTimerRecord[];
  readonly world: readonly WorldCityRecord[];
  readonly deletedAlarmIds: readonly string[];
  readonly deletedTimerIds: readonly string[];
}

/** Priority levels for reminders. */
export type ReminderPriority = "high" | "medium" | "low" | "none";

/** Recurrence rules for reminders. */
export type ReminderRecurrence = "daily" | "weekdays" | "weekly" | "monthly" | "yearly" | "none";

/** Semantic accent color identifiers for reminder lists. */
export type ReminderListColor = "accent" | "amber" | "blue" | "green" | "rose" | "violet";

/** Icon identifiers for reminder lists. */
export type ReminderListIcon = "bookmark" | "bolt" | "heart" | "home" | "list" | "shopping" | "star" | "work";

/** One checklist subtask belonging to a reminder. */
export interface ReminderSubtaskRecord {
  readonly id: string;
  readonly done: boolean;
  readonly title: string;
}

/** One persisted reminder list. */
export interface ReminderListRecord extends EntityClock {
  readonly id: string;
  readonly name: string;
  readonly isDefault: boolean;
  readonly order: number;
  readonly color: ReminderListColor;
  readonly icon: ReminderListIcon;
}

/** One persisted reminder item exchanged between the Reminders app and the resident agent. */
export interface ReminderItemRecord extends Revisioned, EntityClock {
  readonly id: string;
  readonly listId: string;
  readonly title: string;
  readonly notes: string;
  readonly priority: ReminderPriority;
  readonly recurrence: ReminderRecurrence;
  readonly flagged: boolean;
  readonly completed: boolean;
  readonly dueDate: string | null;
  readonly dueMinute: number | null;
  readonly alertMinutes: number | null;
  readonly completedAtMs: number | null;
  readonly snoozedUntilMs: number | null;
  readonly notifiedAtMs: number | null;
  readonly agentTaskId: string | null;
  readonly subtasks: readonly ReminderSubtaskRecord[];
}

/** Full synchronized Reminders state snapshot. */
export interface RemindersSnapshot extends SnapshotEnvelope {
  readonly lists: readonly ReminderListRecord[];
  readonly items: readonly ReminderItemRecord[];
  readonly deletedAgentTaskIds?: readonly string[];
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
