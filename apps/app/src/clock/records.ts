// spec/app/clock/alarms.md, "Story: Manage my alarms"; spec/app/clock/timers.md, "Story: Run multiple countdown timers"

/** Supported alarm and timer chime profiles. */
export type AlarmSound = "radar" | "chime" | "pulse" | "gentle" | "classic";

/** Selectable alarm sound metadata. */
export const ALARM_SOUNDS: ReadonlyArray<{ readonly id: AlarmSound; readonly label: string }> = [
  { id: "radar", label: "Radar" },
  { id: "chime", label: "Chime" },
  { id: "pulse", label: "Pulse" },
  { id: "gentle", label: "Gentle" },
  { id: "classic", label: "Classic" },
];

/** Standard quick-start timer presets. */
export const TIMER_PRESETS: ReadonlyArray<{ readonly label: string; readonly durationMs: number }> = [
  { label: "1m", durationMs: 60_000 },
  { label: "3m", durationMs: 180_000 },
  { label: "5m", durationMs: 300_000 },
  { label: "10m", durationMs: 600_000 },
  { label: "15m", durationMs: 900_000 },
  { label: "30m", durationMs: 1_800_000 },
];

/** Selectable snooze minute options. */
export const SNOOZE_OPTIONS: ReadonlyArray<number> = [1, 5, 9, 10, 15, 20, 30, 45, 60];

/** Shared wire contract for one alarm synced with `/api/alpha/clock`. */
export interface ClockAlarmRecord {
  readonly id: string;
  readonly hour: number;
  readonly minute: number;
  readonly daysMask: number;
  readonly label: string;
  readonly sound: AlarmSound;
  readonly vibrate: boolean;
  readonly enabled: boolean;
  readonly snoozeMinutes: number;
  readonly phase: "idle" | "ringing" | "snoozed";
  readonly fireAtMs: number | null;
  readonly snoozeUntilMs: number | null;
  readonly missed: boolean;
  readonly revision: number;
  readonly updatedAtMs: number;
}

/** Shared wire contract for one countdown timer synced with `/api/alpha/clock`. */
export interface ClockTimerRecord {
  readonly id: string;
  readonly label: string;
  readonly durationMs: number;
  readonly remainingMs: number;
  readonly status: "ready" | "running" | "paused" | "ringing";
  readonly startedAtMs: number | null;
  readonly endAtMs: number | null;
  readonly ringStartedAtMs: number | null;
  readonly revision: number;
  readonly updatedAtMs: number;
}

/** Shared wire contract for one world city synced with `/api/alpha/clock`. */
export interface WorldCityRecord {
  readonly id: string;
  readonly city: string;
  readonly region: string;
  readonly timeZone: string;
  readonly order: number;
}

/** Full Clock sync snapshot exchanged with `/api/alpha/clock`. */
export interface ClockSnapshot {
  readonly version: number;
  readonly updatedAtMs: number;
  readonly alarms: ReadonlyArray<ClockAlarmRecord>;
  readonly timers: ReadonlyArray<ClockTimerRecord>;
  readonly world: ReadonlyArray<WorldCityRecord>;
  readonly deletedAlarmIds: ReadonlyArray<string>;
  readonly deletedTimerIds: ReadonlyArray<string>;
}

/** Rich UI metadata kept outside the integer/enum Quint state for one alarm. */
export interface AlarmMeta {
  readonly label: string;
  readonly sound: AlarmSound;
  readonly remoteId: string;
  readonly updatedAtMs: number;
}

/** Rich UI metadata kept outside the integer/enum Quint state for one timer. */
export interface TimerMeta {
  readonly label: string;
  readonly remoteId: string;
  readonly updatedAtMs: number;
}

/** External store snapshot consumed by React via `useSyncExternalStore`. */
export interface ClockMetaState {
  readonly alarms: ReadonlyMap<number, AlarmMeta>;
  readonly timers: ReadonlyMap<number, TimerMeta>;
  readonly deletedAlarmIds: ReadonlyArray<string>;
  readonly deletedTimerIds: ReadonlyArray<string>;
  readonly version: number;
  readonly hour24: boolean;
}

interface PersistedMeta {
  readonly alarms: ReadonlyArray<readonly [number, AlarmMeta]>;
  readonly timers: ReadonlyArray<readonly [number, TimerMeta]>;
  readonly deletedAlarmIds: ReadonlyArray<string>;
  readonly deletedTimerIds: ReadonlyArray<string>;
  readonly version: number;
}

const VALID_SOUNDS = new Set<string>(ALARM_SOUNDS.map((item) => item.id));

/**
 * Coerce an untrusted sound string to a valid AlarmSound.
 * @throws {never}
 */
export function normalizeSound(value: unknown): AlarmSound {
  return typeof value === "string" && VALID_SOUNDS.has(value) ? (value as AlarmSound) : "radar";
}

/** Label of an AlarmSound for display. */
export function soundLabel(sound: AlarmSound): string {
  return ALARM_SOUNDS.find((item) => item.id === sound)?.label ?? "Radar";
}

let current: ClockMetaState = {
  alarms: new Map(),
  timers: new Map(),
  deletedAlarmIds: [],
  deletedTimerIds: [],
  version: 0,
  hour24: false,
};

const listeners = new Set<() => void>();

function publish(next: ClockMetaState) {
  current = next;
  for (const listener of [...listeners]) listener();
}

/** External store for Clock labels, sounds, remote sync IDs, tombstones, and 24-hour preference. */
export const clockRecords = {
  /** @throws {never} */
  snapshot: (): ClockMetaState => current,
  /** @throws {never} */
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  /** @throws {never} */
  reset: (hour24 = false): void => {
    publish({ alarms: new Map(), timers: new Map(), deletedAlarmIds: [], deletedTimerIds: [], version: 0, hour24 });
  },
  /** @throws {never} */
  setHour24: (hour24: boolean): void => {
    if (current.hour24 === hour24) return;
    publish({ ...current, hour24 });
  },
  /** @throws {never} */
  setAlarm: (id: number, patch: Partial<AlarmMeta>): void => {
    const existing = current.alarms.get(id);
    const next = new Map(current.alarms);
    next.set(id, {
      label: patch.label ?? existing?.label ?? "",
      sound: patch.sound ?? existing?.sound ?? "radar",
      remoteId: patch.remoteId ?? existing?.remoteId ?? `alarm-${id}`,
      updatedAtMs: patch.updatedAtMs ?? existing?.updatedAtMs ?? 0,
    });
    publish({ ...current, alarms: next });
  },
  /** @throws {never} */
  alarm: (id: number): AlarmMeta => {
    return current.alarms.get(id) ?? { label: "", sound: "radar", remoteId: `alarm-${id}`, updatedAtMs: 0 };
  },
  /** @throws {never} */
  markAlarmDeleted: (id: number): void => {
    const remoteId = current.alarms.get(id)?.remoteId ?? `alarm-${id}`;
    const deletedAlarmIds = current.deletedAlarmIds.includes(remoteId)
      ? current.deletedAlarmIds
      : [...current.deletedAlarmIds, remoteId];
    publish({ ...current, deletedAlarmIds });
  },
  /** @throws {never} */
  unmarkAlarmDeleted: (id: number): void => {
    const remoteId = current.alarms.get(id)?.remoteId ?? `alarm-${id}`;
    publish({ ...current, deletedAlarmIds: current.deletedAlarmIds.filter((item) => item !== remoteId) });
  },
  /** @throws {never} */
  setTimer: (id: number, patch: Partial<TimerMeta>): void => {
    const existing = current.timers.get(id);
    const next = new Map(current.timers);
    next.set(id, {
      label: patch.label ?? existing?.label ?? "",
      remoteId: patch.remoteId ?? existing?.remoteId ?? `timer-${id}`,
      updatedAtMs: patch.updatedAtMs ?? existing?.updatedAtMs ?? 0,
    });
    publish({ ...current, timers: next });
  },
  /** @throws {never} */
  timer: (id: number): TimerMeta => {
    return current.timers.get(id) ?? { label: "", remoteId: `timer-${id}`, updatedAtMs: 0 };
  },
  /** @throws {never} */
  markTimerDeleted: (id: number): void => {
    const remoteId = current.timers.get(id)?.remoteId ?? `timer-${id}`;
    const nextTimers = new Map(current.timers);
    nextTimers.delete(id);
    const deletedTimerIds = current.deletedTimerIds.includes(remoteId)
      ? current.deletedTimerIds
      : [...current.deletedTimerIds, remoteId];
    publish({ ...current, timers: nextTimers, deletedTimerIds });
  },
  /** @throws {never} */
  setVersion: (version: number): void => {
    if (version <= current.version) return;
    publish({ ...current, version });
  },
  /** @throws {never} */
  replaceAll: (next: Pick<ClockMetaState, "alarms" | "timers" | "deletedAlarmIds" | "deletedTimerIds" | "version">): void => {
    publish({ ...current, ...next });
  },
  /** @throws {never} */
  serialize: (): string => {
    const payload: PersistedMeta = {
      alarms: [...current.alarms.entries()],
      timers: [...current.timers.entries()],
      deletedAlarmIds: current.deletedAlarmIds,
      deletedTimerIds: current.deletedTimerIds,
      version: current.version,
    };
    return JSON.stringify(payload);
  },
  /** @throws {never} */
  restore: (raw: string): void => {
    try {
      const parsed = JSON.parse(raw) as Partial<PersistedMeta>;
      const alarms = new Map<number, AlarmMeta>();
      if (Array.isArray(parsed.alarms)) {
        for (const entry of parsed.alarms) {
          if (Array.isArray(entry) && typeof entry[0] === "number" && typeof entry[1] === "object" && entry[1] !== null) {
            const meta = entry[1] as Partial<AlarmMeta>;
            alarms.set(entry[0], {
              label: typeof meta.label === "string" ? meta.label : "",
              sound: normalizeSound(meta.sound),
              remoteId: typeof meta.remoteId === "string" && meta.remoteId !== "" ? meta.remoteId : `alarm-${entry[0]}`,
              updatedAtMs: typeof meta.updatedAtMs === "number" ? meta.updatedAtMs : 0,
            });
          }
        }
      }
      const timers = new Map<number, TimerMeta>();
      if (Array.isArray(parsed.timers)) {
        for (const entry of parsed.timers) {
          if (Array.isArray(entry) && typeof entry[0] === "number" && typeof entry[1] === "object" && entry[1] !== null) {
            const meta = entry[1] as Partial<TimerMeta>;
            timers.set(entry[0], {
              label: typeof meta.label === "string" ? meta.label : "",
              remoteId: typeof meta.remoteId === "string" && meta.remoteId !== "" ? meta.remoteId : `timer-${entry[0]}`,
              updatedAtMs: typeof meta.updatedAtMs === "number" ? meta.updatedAtMs : 0,
            });
          }
        }
      }
      const deletedAlarmIds = Array.isArray(parsed.deletedAlarmIds) ? parsed.deletedAlarmIds.filter((x): x is string => typeof x === "string") : [];
      const deletedTimerIds = Array.isArray(parsed.deletedTimerIds) ? parsed.deletedTimerIds.filter((x): x is string => typeof x === "string") : [];
      const version = typeof parsed.version === "number" && Number.isFinite(parsed.version) ? parsed.version : 0;
      publish({ ...current, alarms, timers, deletedAlarmIds, deletedTimerIds, version });
    } catch {
      return;
    }
  },
};
