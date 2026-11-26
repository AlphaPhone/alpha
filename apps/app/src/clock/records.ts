// spec/app/clock/alarms.md, "Story: Manage my alarms"; spec/app/clock/timers.md, "Story: Run multiple countdown timers"
import type { ClockSound } from "@repo/launcher-records";
import { Option, Schema } from "effect";
import { createShelf } from "../runtime/store.ts";

const ClockSoundSchema = Schema.Literals(["radar", "chime", "pulse", "gentle", "classic"]);

const decodeClockSound = Schema.decodeUnknownOption(ClockSoundSchema);

/** Selectable alarm sound metadata. */
export const ALARM_SOUNDS: ReadonlyArray<{ readonly id: ClockSound; readonly label: string }> = [
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

/** Rich UI metadata kept outside the integer/enum Quint state for one alarm. */
export interface AlarmMeta {
  readonly label: string;
  readonly sound: ClockSound;
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
  readonly dirty: boolean;
  readonly localSeq: number;
}

interface PersistedMeta {
  readonly alarms: ReadonlyArray<readonly [number, AlarmMeta]>;
  readonly timers: ReadonlyArray<readonly [number, TimerMeta]>;
  readonly deletedAlarmIds: ReadonlyArray<string>;
  readonly deletedTimerIds: ReadonlyArray<string>;
  readonly version: number;
  readonly dirty: boolean;
}

const PersistedAlarmEntrySchema = Schema.Tuple([
  Schema.Finite,
  Schema.Struct({
    label: Schema.optionalKey(Schema.String),
    sound: Schema.optionalKey(Schema.Unknown),
    remoteId: Schema.optionalKey(Schema.String),
    updatedAtMs: Schema.optionalKey(Schema.Finite),
  }),
]);

const PersistedTimerEntrySchema = Schema.Tuple([
  Schema.Finite,
  Schema.Struct({
    label: Schema.optionalKey(Schema.String),
    remoteId: Schema.optionalKey(Schema.String),
    updatedAtMs: Schema.optionalKey(Schema.Finite),
  }),
]);

const PersistedMetaSchema = Schema.fromJsonString(
  Schema.Struct({
    alarms: Schema.optionalKey(Schema.Array(PersistedAlarmEntrySchema)),
    timers: Schema.optionalKey(Schema.Array(PersistedTimerEntrySchema)),
    deletedAlarmIds: Schema.optionalKey(Schema.Array(Schema.String)),
    deletedTimerIds: Schema.optionalKey(Schema.Array(Schema.String)),
    version: Schema.optionalKey(Schema.Finite),
    dirty: Schema.optionalKey(Schema.Boolean),
  }),
);

const decodePersistedMeta = Schema.decodeUnknownOption(PersistedMetaSchema);

/**
 * Type guard verifying an untrusted value is a valid ClockSound.
 * @throws {never}
 */
export function isAlarmSound(value: unknown): value is ClockSound {
  return Option.isSome(decodeClockSound(value));
}

/**
 * Coerce an untrusted sound string to a valid ClockSound.
 * @throws {never}
 */
export function normalizeSound(value: unknown): ClockSound {
  const decoded = decodeClockSound(value);
  return Option.isSome(decoded) ? decoded.value : "radar";
}

/** Label of a ClockSound for display. */
export function soundLabel(sound: ClockSound): string {
  return ALARM_SOUNDS.find((item) => item.id === sound)?.label ?? "Radar";
}

/**
 * Read alarm UI metadata from a reactive ClockMetaState snapshot.
 * @throws {never}
 */
export function alarmMetaOf(state: ClockMetaState, id: number): AlarmMeta {
  return state.alarms.get(id) ?? { label: "", sound: "radar", remoteId: `alarm-${id}`, updatedAtMs: 0 };
}

/**
 * Read timer UI metadata from a reactive ClockMetaState snapshot.
 * @throws {never}
 */
export function timerMetaOf(state: ClockMetaState, id: number): TimerMeta {
  return state.timers.get(id) ?? { label: "", remoteId: `timer-${id}`, updatedAtMs: 0 };
}

/** Fresh initial ClockMetaState snapshot. */
export function emptyClockMeta(hour24 = false): ClockMetaState {
  return {
    alarms: new Map(),
    timers: new Map(),
    deletedAlarmIds: [],
    deletedTimerIds: [],
    version: 0,
    hour24,
    dirty: false,
    localSeq: 0,
  };
}

/** Scoped reactive metadata store interface for Clock labels, sounds, sync IDs, tombstones, and dirty tracking. */
export interface ClockRecordsStore {
  /** @throws {never} */
  readonly snapshot: () => ClockMetaState;
  /** @throws {never} */
  readonly subscribe: (listener: () => void) => () => void;
  /** @throws {never} */
  readonly reset: (hour24?: boolean) => void;
  /** @throws {never} */
  readonly setHour24: (hour24: boolean) => void;
  /** @throws {never} */
  readonly setAlarm: (id: number, patch: Partial<AlarmMeta>) => void;
  /** @throws {never} */
  readonly deleteAlarm: (id: number) => void;
  /** @throws {never} */
  readonly alarm: (id: number) => AlarmMeta;
  /** @throws {never} */
  readonly markAlarmDeleted: (id: number) => void;
  /** @throws {never} */
  readonly unmarkAlarmDeleted: (id: number) => void;
  /** @throws {never} */
  readonly setTimer: (id: number, patch: Partial<TimerMeta>) => void;
  /** @throws {never} */
  readonly deleteTimer: (id: number) => void;
  /** @throws {never} */
  readonly timer: (id: number) => TimerMeta;
  /** @throws {never} */
  readonly markTimerDeleted: (id: number) => void;
  /** @throws {never} */
  readonly unmarkTimerDeleted: (id: number) => void;
  /** @throws {never} */
  readonly markDirty: () => number;
  /** @throws {never} */
  readonly clearDirty: (seq: number) => void;
  /** @throws {never} */
  readonly localSeq: () => number;
  /** @throws {never} */
  readonly setVersion: (version: number) => void;
  /** @throws {never} */
  readonly replaceAll: (
    next: Pick<ClockMetaState, "alarms" | "timers" | "deletedAlarmIds" | "deletedTimerIds" | "version"> & { readonly dirty?: boolean },
  ) => void;
  /** @throws {never} */
  readonly serialize: () => string;
  /** @throws {never} */
  readonly restore: (raw: string) => void;
}

/**
 * Create a scoped Clock metadata store backed by `createShelf`.
 * @throws {never}
 */
export function createClockRecords(initialHour24 = false): ClockRecordsStore {
  const shelf = createShelf<ClockMetaState>(emptyClockMeta(initialHour24), {
    reset: () => emptyClockMeta(initialHour24),
  });
  return {
    snapshot: shelf.snapshot,
    subscribe: shelf.subscribe,
    reset: (hour24 = false): void => {
      shelf.set(emptyClockMeta(hour24));
    },
    setHour24: (hour24: boolean): void => {
      const state = shelf.get();
      if (state.hour24 === hour24) return;
      shelf.set({ ...state, hour24 });
    },
    setAlarm: (id: number, patch: Partial<AlarmMeta>): void => {
      const state = shelf.get();
      const existing = state.alarms.get(id);
      const next = new Map(state.alarms);
      next.set(id, {
        label: patch.label ?? existing?.label ?? "",
        sound: patch.sound ?? existing?.sound ?? "radar",
        remoteId: patch.remoteId ?? existing?.remoteId ?? `alarm-${id}`,
        updatedAtMs: patch.updatedAtMs ?? existing?.updatedAtMs ?? 0,
      });
      shelf.set({ ...state, alarms: next });
    },
    deleteAlarm: (id: number): void => {
      const state = shelf.get();
      if (!state.alarms.has(id)) return;
      const next = new Map(state.alarms);
      next.delete(id);
      shelf.set({ ...state, alarms: next });
    },
    alarm: (id: number): AlarmMeta => alarmMetaOf(shelf.get(), id),
    markAlarmDeleted: (id: number): void => {
      const state = shelf.get();
      const remoteId = state.alarms.get(id)?.remoteId ?? `alarm-${id}`;
      const deletedAlarmIds = state.deletedAlarmIds.includes(remoteId)
        ? state.deletedAlarmIds
        : [...state.deletedAlarmIds, remoteId];
      shelf.set({ ...state, deletedAlarmIds });
    },
    unmarkAlarmDeleted: (id: number): void => {
      const state = shelf.get();
      const remoteId = state.alarms.get(id)?.remoteId ?? `alarm-${id}`;
      shelf.set({ ...state, deletedAlarmIds: state.deletedAlarmIds.filter((item) => item !== remoteId) });
    },
    setTimer: (id: number, patch: Partial<TimerMeta>): void => {
      const state = shelf.get();
      const existing = state.timers.get(id);
      const next = new Map(state.timers);
      next.set(id, {
        label: patch.label ?? existing?.label ?? "",
        remoteId: patch.remoteId ?? existing?.remoteId ?? `timer-${id}`,
        updatedAtMs: patch.updatedAtMs ?? existing?.updatedAtMs ?? 0,
      });
      shelf.set({ ...state, timers: next });
    },
    deleteTimer: (id: number): void => {
      const state = shelf.get();
      if (!state.timers.has(id)) return;
      const next = new Map(state.timers);
      next.delete(id);
      shelf.set({ ...state, timers: next });
    },
    timer: (id: number): TimerMeta => timerMetaOf(shelf.get(), id),
    markTimerDeleted: (id: number): void => {
      const state = shelf.get();
      const remoteId = state.timers.get(id)?.remoteId ?? `timer-${id}`;
      const nextTimers = new Map(state.timers);
      nextTimers.delete(id);
      const deletedTimerIds = state.deletedTimerIds.includes(remoteId)
        ? state.deletedTimerIds
        : [...state.deletedTimerIds, remoteId];
      shelf.set({ ...state, timers: nextTimers, deletedTimerIds });
    },
    unmarkTimerDeleted: (id: number): void => {
      const state = shelf.get();
      const remoteId = state.timers.get(id)?.remoteId ?? `timer-${id}`;
      shelf.set({ ...state, deletedTimerIds: state.deletedTimerIds.filter((item) => item !== remoteId) });
    },
    markDirty: (): number => {
      const state = shelf.get();
      const localSeq = state.localSeq + 1;
      shelf.set({ ...state, dirty: true, localSeq });
      return localSeq;
    },
    clearDirty: (seq: number): void => {
      const state = shelf.get();
      if (!state.dirty || state.localSeq !== seq) return;
      shelf.set({ ...state, dirty: false });
    },
    localSeq: (): number => shelf.get().localSeq,
    setVersion: (version: number): void => {
      const state = shelf.get();
      if (version <= state.version) return;
      shelf.set({ ...state, version });
    },
    replaceAll: (next): void => {
      const state = shelf.get();
      shelf.set({
        ...state,
        alarms: next.alarms,
        timers: next.timers,
        deletedAlarmIds: next.deletedAlarmIds,
        deletedTimerIds: next.deletedTimerIds,
        version: next.version,
        dirty: next.dirty ?? state.dirty,
      });
    },
    serialize: (): string => {
      const state = shelf.get();
      const payload: PersistedMeta = {
        alarms: [...state.alarms.entries()],
        timers: [...state.timers.entries()],
        deletedAlarmIds: state.deletedAlarmIds,
        deletedTimerIds: state.deletedTimerIds,
        version: state.version,
        dirty: state.dirty,
      };
      return JSON.stringify(payload);
    },
    restore: (raw: string): void => {
      const decoded = decodePersistedMeta(raw);
      if (Option.isNone(decoded)) return;
      const parsed = decoded.value;
      const alarms = new Map<number, AlarmMeta>();
      for (const [id, meta] of parsed.alarms ?? []) {
        if (!Number.isSafeInteger(id) || id <= 0) continue;
        alarms.set(id, {
          label: meta.label ?? "",
          sound: normalizeSound(meta.sound),
          remoteId: meta.remoteId !== undefined && meta.remoteId !== "" ? meta.remoteId : `alarm-${id}`,
          updatedAtMs: meta.updatedAtMs ?? 0,
        });
      }
      const timers = new Map<number, TimerMeta>();
      for (const [id, meta] of parsed.timers ?? []) {
        if (!Number.isSafeInteger(id) || id <= 0) continue;
        timers.set(id, {
          label: meta.label ?? "",
          remoteId: meta.remoteId !== undefined && meta.remoteId !== "" ? meta.remoteId : `timer-${id}`,
          updatedAtMs: meta.updatedAtMs ?? 0,
        });
      }
      const state = shelf.get();
      shelf.set({
        ...state,
        alarms,
        timers,
        deletedAlarmIds: [...new Set(parsed.deletedAlarmIds ?? [])],
        deletedTimerIds: [...new Set(parsed.deletedTimerIds ?? [])],
        version: parsed.version !== undefined && parsed.version >= 0 ? Math.floor(parsed.version) : 0,
        dirty: parsed.dirty ?? false,
      });
    },
  };
}

/** Fallback metadata store for standalone callers outside a ClockRecords layer. */
export const clockRecords: ClockRecordsStore = createClockRecords();
