/**
 * How Automations names an agent scheduled item and words its schedule. The resident agent lists
 * its LifeOps scheduled tasks (`/api/lifeops/scheduled-tasks`) with upstream identifiers: the
 * default packs' `metadata.recordKey`, the task `kind` (`ScheduledTaskKind` in plugin-scheduling
 * `scheduled-task/types.ts`), and for relative and window triggers the `anchorKey` (the anchor
 * registry of plugin-scheduling `anchors/anchor-registry.ts` and plugin-health `HEALTH_ANCHORS`)
 * and the `windowKey` (`OWNER_WINDOW_KEYS` in plugin-scheduling `scheduled-task/window-bounds.ts`).
 * Alpha words each identifier here; an
 * identifier Alpha has no words for reads as the row's own fallback, never as the identifier.
 */

/** Alpha's title for each owner-visible default-pack record, keyed on its `recordKey`. */
export const SCHEDULED_RECORD_TITLES: ReadonlyMap<string, string> = new Map([
  ["gm", "Good morning"],
  ["gn", "Good night"],
  ["checkin", "Daily check-in"],
  ["checkin-followup", "Check-in follow-up"],
  ["weekly-review", "Weekly review"],
  ["morning-brief", "Morning brief"],
  ["daily-command-brief", "Daily brief"],
  ["daily-9am", "Daily inbox review"],
  ["followup-child", "Follow-up"],
  ["monthly-family-coordination", "Monthly family planning"],
  ["morning-checkin", "Morning check-in"],
  ["start-now", "Start-of-day nudge"],
]);

/** Alpha's title for a scheduled item without a record title, keyed on its task `kind`. */
export const SCHEDULED_KIND_TITLES: ReadonlyMap<string, string> = new Map([
  ["reminder", "Reminder"],
  ["checkin", "Check-in"],
  ["followup", "Follow-up"],
  ["approval", "Approval request"],
  ["recap", "Recap"],
  ["watcher", "Watch"],
  ["output", "Scheduled update"],
  ["custom", "Scheduled task"],
]);

export const SCHEDULED_TASK_FALLBACK_TITLE = "Scheduled task";

/** The Automations row title for a scheduled task record. */
export function scheduledTaskTitle(record: { kind?: unknown; metadata?: { recordKey?: unknown } | null }): string {
  const recordKey = typeof record.metadata?.recordKey === "string" ? record.metadata.recordKey : "";
  const kind = typeof record.kind === "string" ? record.kind : "";
  return SCHEDULED_RECORD_TITLES.get(recordKey) ?? SCHEDULED_KIND_TITLES.get(kind) ?? SCHEDULED_TASK_FALLBACK_TITLE;
}

/**
 * Alpha's words for each anchor a relative trigger names: the sentence for the anchor itself and
 * the phrase an offset is measured from.
 */
export const SCHEDULE_ANCHORS: ReadonlyMap<string, { at: string; from: string }> = new Map([
  ["wake.observed", { at: "When you start waking up", from: "you start waking up" }],
  ["wake.confirmed", { at: "When you wake up", from: "you wake up" }],
  ["bedtime.target", { at: "At your bedtime", from: "your bedtime" }],
  ["nap.start", { at: "When your nap starts", from: "your nap starts" }],
  ["morning.start", { at: "When your morning starts", from: "your morning starts" }],
  ["night.start", { at: "When your evening starts", from: "your evening starts" }],
  ["lunch.start", { at: "At lunchtime", from: "lunchtime" }],
  ["meeting.ended", { at: "When a meeting ends", from: "a meeting ends" }],
]);

export const RELATIVE_SCHEDULE_FALLBACK = "Relative schedule";

/** "45 minutes", "1 hour", "2 hours 30 minutes". */
function duration(minutes: number): string {
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  const part = (count: number, unit: string) => `${count} ${unit}${count === 1 ? "" : "s"}`;
  if (!hours) return part(rest, "minute");
  return rest ? `${part(hours, "hour")} ${part(rest, "minute")}` : part(hours, "hour");
}

/** The schedule line for a `relative_to_anchor` trigger: the anchor and its offset in Alpha's words. */
export function relativeScheduleText(anchorKey: unknown, offsetMinutes: unknown): string {
  const anchor = SCHEDULE_ANCHORS.get(typeof anchorKey === "string" ? anchorKey.trim() : "");
  if (!anchor) return RELATIVE_SCHEDULE_FALLBACK;
  const offset = typeof offsetMinutes === "number" && Number.isFinite(offsetMinutes) ? Math.round(offsetMinutes) : 0;
  if (!offset) return anchor.at;
  return `${duration(Math.abs(offset))} ${offset > 0 ? "after" : "before"} ${anchor.from}`;
}

/** Alpha's words for each owner window a `during_window` trigger names. */
export const SCHEDULE_WINDOWS: ReadonlyMap<string, string> = new Map([
  ["morning", "In the morning"],
  ["afternoon", "In the afternoon"],
  ["evening", "In the evening"],
  ["night", "At night"],
  ["morning_or_night", "In the morning or at night"],
  ["morning_or_evening", "In the morning or evening"],
]);

export const WINDOW_SCHEDULE_FALLBACK = "Scheduled window";

/** The schedule line for a `during_window` trigger. */
export function windowScheduleText(windowKey: unknown): string {
  return SCHEDULE_WINDOWS.get(typeof windowKey === "string" ? windowKey.trim() : "") ?? WINDOW_SCHEDULE_FALLBACK;
}
