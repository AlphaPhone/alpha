// spec/app/reminders/index.md, "Story: Organize reminders across smart views and custom lists"
import type { Priority, SmartView, SortKey } from "../../gen/app__reminders.ts";
import type { Repeat } from "../../gen/app__reminders__recurrence.ts";
import { type ReminderRecurrence, civilDayFromString, civilDayNumber, dueInstantMs } from "./recurrence.ts";

export type { ReminderRecurrence };

/** Semantic color token choices for custom reminder lists. */
export type ReminderListColor = "accent" | "blue" | "green" | "amber" | "rose" | "violet";

/** Icon identifiers for custom reminder lists. */
export type ReminderListIcon = "list" | "home" | "work" | "shopping" | "heart" | "star" | "bookmark" | "bolt";

/** Wire priority values shared with the resident agent. */
export type ReminderPriority = "none" | "low" | "medium" | "high";

/** One custom or default reminder list record. */
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

/** One checklist subtask nested inside a reminder. */
export interface ReminderSubtaskRecord {
  readonly id: string;
  readonly title: string;
  readonly done: boolean;
}

/** One rich reminder item record matching the shared agent wire contract. */
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

/** Full reminders snapshot synced with the resident agent and cached locally. */
export interface RemindersSnapshot {
  readonly version: number;
  readonly updatedAtMs: number;
  readonly lists: readonly ReminderListRecord[];
  readonly items: readonly ReminderItemRecord[];
}

/** Filter parameters applied to a reminder list view. */
export interface ReminderFilterState {
  readonly showCompleted: boolean;
  readonly flaggedOnly: boolean;
  readonly priority: ReminderPriority;
}

/** Chronological section bucket for the Scheduled smart view. */
export type ScheduledBucket = "Overdue" | "Today" | "Tomorrow" | "Upcoming";

/** A reminder item together with its numeric spec id and computed overdue status. */
export interface DecoratedReminder {
  readonly item: ReminderItemRecord;
  readonly specId: number;
  readonly overdue: boolean;
}

/** Default Reminders list constant. */
export const DEFAULT_LIST_ID = "default";

/** Create the canonical default Reminders list record. @throws {never} */
export function createDefaultList(nowMs = 0): ReminderListRecord {
  return {
    id: DEFAULT_LIST_ID,
    name: "Reminders",
    color: "blue",
    icon: "list",
    isDefault: true,
    order: 0,
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
  };
}

/** Create an initial empty snapshot containing only the default Reminders list. @throws {never} */
export function defaultSnapshot(nowMs = 0): RemindersSnapshot {
  return { version: 0, updatedAtMs: nowMs, lists: [createDefaultList(nowMs)], items: [] };
}

/** Convert wire priority to spec priority. @throws {never} */
export function priorityToSpec(priority: ReminderPriority): Priority {
  switch (priority) {
    case "low": return "LowPriority";
    case "medium": return "MediumPriority";
    case "high": return "HighPriority";
    default: return "NoPriority";
  }
}

/** Convert spec priority to wire priority. @throws {never} */
export function specToPriority(priority: Priority): ReminderPriority {
  switch (priority) {
    case "LowPriority": return "low";
    case "MediumPriority": return "medium";
    case "HighPriority": return "high";
    default: return "none";
  }
}

/** Convert wire recurrence to spec repeat. @throws {never} */
export function recurrenceToSpec(recurrence: ReminderRecurrence): Repeat {
  switch (recurrence) {
    case "daily": return "Daily";
    case "weekdays": return "Weekdays";
    case "weekly": return "Weekly";
    case "monthly": return "Monthly";
    case "yearly": return "Yearly";
    default: return "NoRepeat";
  }
}

const priorityRank: Readonly<Record<ReminderPriority, number>> = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

/** Determine whether a reminder item is overdue at `nowMs`. @throws {never} */
export function isItemOverdue(item: ReminderItemRecord, nowMs: number): boolean {
  if (item.completed || !item.dueDate) return false;
  if (item.snoozedUntilMs !== null && item.snoozedUntilMs > nowMs) return false;
  if (item.dueMinute !== null) {
    const due = dueInstantMs(item.dueDate, item.dueMinute);
    return due !== null && due <= nowMs;
  }
  const dueDay = civilDayFromString(item.dueDate);
  return dueDay !== undefined && dueDay < civilDayNumber(nowMs);
}

/** Determine whether a reminder item belongs in the Today smart view at `nowMs`. */
export function isItemToday(item: ReminderItemRecord, nowMs: number): boolean {
  if (item.completed || !item.dueDate) return false;
  const dueDay = civilDayFromString(item.dueDate);
  return dueDay !== undefined && dueDay <= civilDayNumber(nowMs);
}

/** Determine the Scheduled smart view bucket for an active dated reminder. */
export function scheduledBucketOf(item: ReminderItemRecord, nowMs: number): ScheduledBucket {
  if (isItemOverdue(item, nowMs)) return "Overdue";
  const today = civilDayNumber(nowMs);
  const dueDay = civilDayFromString(item.dueDate) ?? today;
  if (dueDay <= today) return "Today";
  if (dueDay === today + 1) return "Tomorrow";
  return "Upcoming";
}

/** Compute live counts for all six built-in smart lists. */
export function computeSmartCounts(items: readonly ReminderItemRecord[], hiddenIds: ReadonlySet<string>, nowMs: number): Readonly<Record<SmartView, number>> {
  let today = 0;
  let scheduled = 0;
  let all = 0;
  let flagged = 0;
  let overdue = 0;
  let completed = 0;
  for (const item of items) {
    if (hiddenIds.has(item.id)) continue;
    if (item.completed) {
      completed += 1;
      continue;
    }
    all += 1;
    if (item.flagged) flagged += 1;
    if (item.dueDate) {
      scheduled += 1;
      if (isItemToday(item, nowMs)) today += 1;
      if (isItemOverdue(item, nowMs)) overdue += 1;
    }
  }
  return {
    TodayView: today,
    ScheduledView: scheduled,
    AllView: all,
    FlaggedView: flagged,
    OverdueView: overdue,
    CompletedView: completed,
  };
}

/** Sort reminder items according to `sortKey`. */
export function sortReminders(items: readonly ReminderItemRecord[], sortKey: SortKey): ReminderItemRecord[] {
  const copy = [...items];
  copy.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    switch (sortKey) {
      case "SortDue": {
        const aDue = dueInstantMs(a.dueDate, a.dueMinute) ?? Number.MAX_SAFE_INTEGER;
        const bDue = dueInstantMs(b.dueDate, b.dueMinute) ?? Number.MAX_SAFE_INTEGER;
        if (aDue !== bDue) return aDue - bDue;
        return priorityRank[b.priority] - priorityRank[a.priority] || a.createdAtMs - b.createdAtMs;
      }
      case "SortPriority":
        return priorityRank[b.priority] - priorityRank[a.priority] || a.title.localeCompare(b.title);
      case "SortTitle":
        return a.title.localeCompare(b.title);
      case "SortCreated":
        return b.createdAtMs - a.createdAtMs;
    }
  });
  return copy;
}

/** Search across reminder title, notes, and subtask titles (case-insensitive substring match). */
export function searchReminders(items: readonly ReminderItemRecord[], query: string, hiddenIds: ReadonlySet<string>): ReminderItemRecord[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return items.filter((item) => {
    if (hiddenIds.has(item.id)) return false;
    if (item.title.toLowerCase().includes(needle)) return true;
    if (item.notes.toLowerCase().includes(needle)) return true;
    return item.subtasks.some((sub) => sub.title.toLowerCase().includes(needle));
  });
}

/** Select and sort items for a smart view or custom list with filters applied. */
export function selectViewItems(
  items: readonly ReminderItemRecord[],
  view: { readonly kind: "smart"; readonly view: SmartView } | { readonly kind: "list"; readonly listId: string },
  filter: ReminderFilterState,
  sortKey: SortKey,
  hiddenIds: ReadonlySet<string>,
  nowMs: number,
): ReminderItemRecord[] {
  const matching = items.filter((item) => {
    if (hiddenIds.has(item.id)) return false;
    if (view.kind === "smart") {
      switch (view.view) {
        case "TodayView": if (!isItemToday(item, nowMs)) return false; break;
        case "ScheduledView": if (item.completed || !item.dueDate) return false; break;
        case "AllView": if (item.completed && !filter.showCompleted) return false; break;
        case "FlaggedView": if (item.completed || !item.flagged) return false; break;
        case "OverdueView": if (!isItemOverdue(item, nowMs)) return false; break;
        case "CompletedView": if (!item.completed) return false; break;
      }
    } else {
      if (item.listId !== view.listId) return false;
      if (item.completed && !filter.showCompleted) return false;
    }
    if (filter.flaggedOnly && !item.flagged) return false;
    if (filter.priority !== "none" && item.priority !== filter.priority) return false;
    return true;
  });
  return sortReminders(matching, sortKey);
}

/** External store state observed synchronously by React screens via `useSyncExternalStore`. */
export interface RemindersStoreView {
  readonly snapshot: RemindersSnapshot;
  readonly hiddenIds: ReadonlySet<string>;
  readonly syncError: string | null;
  readonly listSpecIds: ReadonlyMap<string, number>;
  readonly itemSpecIds: ReadonlyMap<string, number>;
}

function emptyStoreView(): RemindersStoreView {
  return {
    snapshot: { version: 0, updatedAtMs: 0, lists: [createDefaultList(0)], items: [] },
    hiddenIds: new Set(),
    syncError: null,
    listSpecIds: new Map([[DEFAULT_LIST_ID, 1]]),
    itemSpecIds: new Map(),
  };
}

let current: RemindersStoreView = emptyStoreView();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of [...listeners]) listener();
}

function assignSpecIds(
  lists: readonly ReminderListRecord[],
  items: readonly ReminderItemRecord[],
  prevLists: ReadonlyMap<string, number>,
  prevItems: ReadonlyMap<string, number>,
): { readonly listSpecIds: Map<string, number>; readonly itemSpecIds: Map<string, number> } {
  const listSpecIds = new Map<string, number>([[DEFAULT_LIST_ID, 1]]);
  let nextList = 2;
  for (const existing of prevLists.values()) if (existing >= nextList) nextList = existing + 1;
  for (const list of lists) {
    if (list.isDefault || list.id === DEFAULT_LIST_ID) {
      listSpecIds.set(list.id, 1);
    } else {
      const prior = prevLists.get(list.id);
      if (prior !== undefined) listSpecIds.set(list.id, prior);
      else listSpecIds.set(list.id, nextList++);
    }
  }
  const itemSpecIds = new Map<string, number>();
  let nextItem = 1;
  for (const existing of prevItems.values()) if (existing >= nextItem) nextItem = existing + 1;
  for (const item of items) {
    const prior = prevItems.get(item.id);
    if (prior !== undefined) itemSpecIds.set(item.id, prior);
    else itemSpecIds.set(item.id, nextItem++);
  }
  return { listSpecIds, itemSpecIds };
}

/** Count active (non-completed, non-hidden) items belonging to `listId`. @throws {never} */
export function listActiveCount(snapshot: RemindersSnapshot, hiddenIds: ReadonlySet<string>, listId: string): number {
  let count = 0;
  for (const item of snapshot.items) {
    if (!item.completed && !hiddenIds.has(item.id) && item.listId === listId) count += 1;
  }
  return count;
}

/** Group scheduled items into Overdue, Today, Tomorrow, and Upcoming sections. @throws {never} */
export function groupScheduledItems(
  items: readonly ReminderItemRecord[],
  nowMs: number,
): readonly { readonly key: ScheduledBucket; readonly label: string; readonly items: ReminderItemRecord[] }[] {
  const order: readonly ScheduledBucket[] = ["Overdue", "Today", "Tomorrow", "Upcoming"];
  const map = new Map<ScheduledBucket, ReminderItemRecord[]>(order.map((bucket) => [bucket, []]));
  for (const item of items) map.get(scheduledBucketOf(item, nowMs))!.push(item);
  return order.map((key) => ({ key, label: key, items: map.get(key)! })).filter((group) => group.items.length > 0);
}

/** Ensure the default Reminders list is always present in any snapshot. @throws {never} */
export function normalizeSnapshot(snapshot: RemindersSnapshot): RemindersSnapshot {
  const hasDefault = snapshot.lists.some((list) => list.isDefault || list.id === DEFAULT_LIST_ID);
  const lists = hasDefault ? [...snapshot.lists] : [createDefaultList(snapshot.updatedAtMs), ...snapshot.lists];
  lists.sort((a, b) => (a.isDefault === b.isDefault ? a.order - b.order : a.isDefault ? -1 : 1));
  const validListIds = new Set(lists.map((list) => list.id));
  const defaultId = lists.find((list) => list.isDefault)?.id ?? DEFAULT_LIST_ID;
  const items = snapshot.items.map((item) => (validListIds.has(item.listId) ? item : { ...item, listId: defaultId }));
  return { ...snapshot, lists, items };
}

/** Synchronous external store for Reminders data, read by screens with `useSyncExternalStore`. */
export const remindersStore = {
  /** @throws {never} */
  snapshot: (): RemindersStoreView => current,
  /** @throws {never} */
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  /** @throws {never} */
  reset(): void {
    current = emptyStoreView();
    notify();
  },
  /** @throws {never} */
  replace(snapshot: RemindersSnapshot, syncError: string | null = null): RemindersStoreView {
    const normalized = normalizeSnapshot(snapshot);
    const ids = assignSpecIds(normalized.lists, normalized.items, current.listSpecIds, current.itemSpecIds);
    current = { snapshot: normalized, hiddenIds: current.hiddenIds, syncError, ...ids };
    notify();
    return current;
  },
  /** @throws {never} */
  setHidden(hiddenIds: ReadonlySet<string>): void {
    current = { ...current, hiddenIds: new Set(hiddenIds) };
    notify();
  },
  /** @throws {never} */
  setSyncError(syncError: string | null): void {
    current = { ...current, syncError };
    notify();
  },
  /** @throws {never} */
  findItem(id: string): ReminderItemRecord | undefined {
    return current.snapshot.items.find((item) => item.id === id);
  },
  /** @throws {never} */
  findItemBySpecId(specId: number): ReminderItemRecord | undefined {
    for (const [id, num] of current.itemSpecIds) {
      if (num === specId) return current.snapshot.items.find((item) => item.id === id);
    }
    return undefined;
  },
  /** @throws {never} */
  findList(id: string): ReminderListRecord | undefined {
    return current.snapshot.lists.find((list) => list.id === id);
  },
  /** @throws {never} */
  findListBySpecId(specId: number): ReminderListRecord | undefined {
    for (const [id, num] of current.listSpecIds) {
      if (num === specId) return current.snapshot.lists.find((list) => list.id === id);
    }
    return undefined;
  },
  /** @throws {never} */
  specIdForItem(id: string): number {
    return current.itemSpecIds.get(id) ?? 0;
  },
  /** @throws {never} */
  specIdForList(id: string): number {
    return current.listSpecIds.get(id) ?? 1;
  },
};
