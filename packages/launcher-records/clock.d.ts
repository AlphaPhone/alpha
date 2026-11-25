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
