// spec/workflows/vocabulary.md, "Story: Read my workflows in Alpha's words"; spec/workflows/agentSchedules.md, "Story: Answer a scheduled item from Workflows"; spec/workflows/digests.md, "Story: Read a digest's state plainly"
import type { RunWord, StatusWord, ChangeWord, Occurred } from "../../../gen/workflows__vocabulary.ts";
import type { LoopWord, DigestNotice } from "../../../gen/workflows__digests.ts";
import type { ReportWord } from "../../workflows/automations.vibe";

/** Alpha's word for each run status the agent reports. */
export const runWords: Record<RunWord, string> = {
  RunCancelled: "Cancelled", RunCompleted: "Completed", RunContinued: "Continued in a new run", RunFailed: "Failed",
  RunFinished: "Finished", RunPaused: "Paused", RunQueued: "Queued", RunRunning: "Running",
  WaitingApproval: "Waiting for approval", WaitingEvent: "Waiting for an event", WaitingQuota: "Waiting for capacity",
  WaitingTimer: "Waiting for a timer", RunSkipped: "Skipped", RunUnknown: "Status unknown",
};

/** How an occurrence that did not run reads. */
export const occurredWords: Record<Occurred, string> = {
  Ran: "", Missed: "Missed — not run", Overlapped: "Skipped — an earlier run was still active", SourceUnavailable: "Not run — source unavailable",
};

/** Alpha's sentence for an occurrence the agent recorded without running it. */
export const occurredSentences: Record<Occurred, string> = {
  Ran: "",
  Missed: "This occurrence came due while your phone or agent was off. Nothing ran, and it won’t run later.",
  Overlapped: "An earlier run was still going, so this occurrence didn’t run.",
  SourceUnavailable: "This occurrence’s source can’t be read, so it didn’t run. No phone data was read.",
};

const automationStatus: Record<string, string> = {
  active: "Active", paused: "Paused", completed: "Completed", draft: "Draft", system: "System", scheduled: "Scheduled",
  fired: "Sent", acknowledged: "Acknowledged", skipped: "Skipped", expired: "Expired", failed: "Failed", dismissed: "Dismissed",
  snoozed: "Snoozed", archived: "Archived", cancelled: "Cancelled", muted: "Muted", delivered: "Delivered", blocked: "Delivery blocked",
  duplicate: "Duplicate skipped", unknown: "Unknown", unscheduled: "—", pending: "Pending", posted: "Shown",
  "permission-denied": "Notifications not allowed", "scheduling-failed": "Couldn’t schedule", removed: "Removed",
};

/** Alpha's word for a row's status, given the vocabulary's verdict on it. */
export function statusText(word: StatusWord, status: string): string {
  switch (word) {
    case "NoWord": return "";
    case "ActiveWord": return "Active";
    case "InactiveWord": return "Inactive";
    case "Unknown": return "Unknown";
    case "Worded": return automationStatus[status] ?? "Unknown";
  }
}

/** The word on a workflow change card. */
export const changeWords: Record<ChangeWord, string> = {
  Created: "Created", Updated: "Updated", TurnedOn: "Turned on", PausedWord: "Paused", Restored: "Restored",
  Renamed: "Renamed", RemovedWord: "Removed", Changed: "Changed",
};

/** What the owner is told after a change, by its known outcome. */
export const reportWords: Record<ReportWord, string> = {
  limit: "This automation was not turned on. Your agent is at its limit of active automations or is busy; pause another or try again later.",
  "not-confirmed": "Your agent didn’t confirm this change. Check it before trying again.",
  "not-sent": "Nothing was sent.",
  "prompt-not-run": "The prompt did not run. Check its history.",
  "fire-skipped": "This item was skipped. Read its current status before trying again.",
  "fire-deferred": "Your agent couldn’t deliver this item yet. It will try again later.",
  "fire-failed": "Your agent couldn’t deliver this item, so it did not run.",
  "fire-raced": "Another run was already in progress.",
  "needs-name": "Add a name and instructions.",
  "needs-future-time": "Choose a future time.",
  "needs-schedule": "Add a schedule.",
  "needs-event": "Add an event name.",
  "needs-instructions": "Enter instructions for this schedule.",
  "snooze-past": "Choose a future snooze time.",
  "not-editable": "This prompt can’t be changed here. Its saved trigger couldn’t be read.",
};

/** What a renewal reminder tap said when it could not open a review. */
export const renewalChanged = "This renewal changed. Open the digest sources to review them again.";

/** Why a phone source could not be reviewed, or what saving it did. */
export const phoneSourceWords: Record<string, string> = {
  NeedsSourceName: "Name this source selection before reviewing it.",
  CalendarsGone: "Some selected calendars are no longer available. Choose again.",
  TooManyCalendars: "Choose at most 16 calendars for this source.",
  NeedsAKind: "Select a calendar or reminders first.",
  NeedsHours: "Choose an expiry from 1 to 168 hours (7 days).",
  saved: "Saved. Your digest reads these sources until they expire.",
  refused: "This phone didn’t allow the read. Nothing was sent.",
  unconfirmed: "Your agent didn’t confirm this source. Retry from the saved change.",
  busy: "Another digest change is still being saved.",
};

/** What the phone's calendar list said when it could not be read. */
export const phoneCalendarWords: Record<"permission-denied" | "unavailable" | "not-on-phone", string> = {
  "permission-denied": "Allow Calendar access to choose calendars for this source.",
  unavailable: "This phone’s calendars couldn’t be read. Try again with Alpha in front.",
  "not-on-phone": "Phone sources are chosen on the phone.",
};

/** What removing Google access did. */
export const revokeWords: Record<"revoked" | "changed" | "unconfirmed", string> = {
  revoked: "Google access was removed. These sources and digests no longer read Google.",
  changed: "What reads through Google changed. Review the updated list.",
  unconfirmed: "Cloud didn’t confirm the removal. Check it before trying again.",
};

/** An answer that was lost: the change stays held. */
export const outcomeUnknown = "Outcome unknown";

const scheduledTitles: Record<string, string> = {
  gm: "Good morning", gn: "Good night", checkin: "Daily check-in", "checkin-followup": "Check-in follow-up", "weekly-review": "Weekly review",
  "morning-brief": "Morning brief", "daily-command-brief": "Daily brief", "daily-9am": "Daily inbox review", "followup-child": "Follow-up",
  "monthly-family-coordination": "Monthly family planning", "morning-checkin": "Morning check-in", "start-now": "Start-of-day nudge",
  reminder: "Reminder", followup: "Follow-up", approval: "Approval request", recap: "Recap", watcher: "Watch", output: "Scheduled update", custom: "Scheduled task",
};

/** A scheduled item's title from its record key or kind; never the identifier itself. */
export function scheduledTitle(code: string): string {
  return scheduledTitles[code] ?? "Scheduled task";
}

const anchors: Record<string, readonly [string, string]> = {
  "wake.observed": ["When you start waking up", "you start waking up"], "wake.confirmed": ["When you wake up", "you wake up"],
  "bedtime.target": ["At your bedtime", "your bedtime"], "nap.start": ["When your nap starts", "your nap starts"],
  "morning.start": ["When your morning starts", "your morning starts"], "night.start": ["When your evening starts", "your evening starts"],
  "lunch.start": ["At lunchtime", "lunchtime"], "meeting.ended": ["When a meeting ends", "a meeting ends"],
};
const windows: Record<string, string> = {
  morning: "In the morning", afternoon: "In the afternoon", evening: "In the evening", night: "At night",
  morning_or_night: "In the morning or at night", morning_or_evening: "In the morning or evening",
};

function duration(minutes: number): string {
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  return !hours ? part(rest, "minute") : rest ? `${part(hours, "hour")} ${part(rest, "minute")}` : part(hours, "hour");
}

/** One instant in the phone's zone. */
export function when(at: number): string {
  return Number.isFinite(at) && at > 0 ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(at) : "";
}

/** A row's schedule code in Alpha's words. */
export function scheduleText(code: string): string {
  const [main, extra] = code.split("|snoozed:");
  const snoozed = extra === undefined ? "" : ` · Snoozed until ${when(Date.parse(extra))}`;
  const [kind, ...rest] = main.split(":");
  const value = rest.join(":");
  switch (kind) {
    case "once": return (when(Date.parse(value)) || "Once") + snoozed;
    case "cron": {
      const [expression, zone] = value.split("|");
      const daily = /^(\d{1,2}) (\d{1,2}) \* \* \*$/.exec(expression ?? "");
      const text = daily ? `Daily at ${daily[2].padStart(2, "0")}:${daily[1].padStart(2, "0")}` : "Repeats";
      return `${text}${zone ? ` (${zone})` : ""}${snoozed}`;
    }
    case "event": return "On an event";
    case "manual": return "Manual";
    case "after": return "After another task";
    case "relative": {
      const [anchor, offset] = value.split(":");
      const words = anchors[anchor ?? ""];
      const minutes = Math.round(Number(offset) || 0);
      if (!words) return "Relative schedule";
      return minutes ? `${duration(Math.abs(minutes))} ${minutes > 0 ? "after" : "before"} ${words[1]}` : words[0];
    }
    case "window": return windows[value] ?? "Scheduled window";
    case "routine": return ({ daily: "Daily", times_per_day: "Several times a day", weekly: "Weekly", interval: "Repeats" } as Record<string, string>)[value] ?? "";
    case "goal": return "Goal";
    default: return "";
  }
}

/** A digest's state in a word. */
export const loopWords: Record<LoopWord, string> = {
  LoopRemoved: "Removed", LoopPaused: "Paused", SourceRevoked: "Source revoked — renew to resume", SourceExpired: "Source expired — renew to resume", LoopOn: "On",
};

/** What the digest panel says after a change. */
export const digestNotices: Record<DigestNotice, string> = {
  NoDigestNotice: "", ChangeUnconfirmed: "Your agent didn’t confirm this change yet. Retry to send it again.",
  RequestDiscarded: "Discarded. Nothing was sent.", DiscardRefused: "This request couldn’t be discarded. It is still saved.",
  ClearRefused: "This request couldn’t be cleared. It is still saved.",
  SourceRejected: "Your access to this source changed before it was saved. Refresh your accounts and review the source again.",
  ScheduleRejected: "This schedule wasn’t saved. Review it again.", ReviewAgain: "This digest changed on your agent. Review it again.",
};

const digestErrors: Record<string, string> = {
  "Hosted source grant expired or was revoked": "This digest’s source expired or was revoked, so it did not run. Renew or review the source.",
  "Invalid IANA timezone": "This digest’s time zone is not recognized, so it did not run. Edit its schedule.",
  "Digest source not found": "This digest’s source no longer exists, so it did not run. Review a new source.",
  "Digest source integrity changed": "This digest’s source changed since you reviewed it, so it did not run. Review the source again.",
  "Digest occurrence does not match its reviewed local schedule": "This run did not match the digest’s reviewed schedule, so it did not run.",
  "Native source consent expired or revoked": "Your consent for this digest to read this phone expired or was revoked. Review the source to turn it back on.",
  "Native source host or owner unavailable": "Your agent could not reach this phone’s Calendar and reminders, so this digest did not run.",
  "Hosted Google read timed out": "Google took too long to answer, so this digest did not run. Try again later.",
};

/** A digest result's text: Alpha's sentence for a known error, the brief itself otherwise. */
export function digestText(error: string, text: string): string {
  if (error) return digestErrors[error.trim()] ?? "This digest stopped with an error on your agent.";
  return text || "No readable summary was returned.";
}

/** Alpha's sentence for a run's reconciliation state. */
export function reconciliationText(state: string): string {
  return state === "outcome-unknown" ? "Your agent lost track of this run before it finished, so what it did is unknown. Check before running it again."
    : state === "worker-running" ? "Your agent is still checking whether this run is going." : "";
}

/** The refusal shown before anything is sent, naming the steps this phone can use instead. */
export function scopeRefusalText(categories: ReadonlyArray<string>, operations: ReadonlyArray<string>): string {
  const reasons: Record<string, string> = {
    Calls: "place or answer phone calls", Sms: "send text messages", Payments: "make payments or move money",
    Contacts: "read or change Contacts", ArbitraryCode: "run arbitrary code, scripts or web requests", UnnamedEmail: "send email to recipients you have not named",
  };
  const labels: Record<string, string> = {
    supplied_text: "Read supplied text", selected_notes: "Read selected Notes", selected_reminders: "Read today’s reminders",
    calendar_range: "Read a Calendar range", contains: "Continue if text matches", compose_draft: "Compose text",
    model_draft: "Ask the agent to draft text", save_note: "Save a note", app_notification: "Post a notification", read_aloud: "Read aloud",
  };
  const list = (items: string[]) => items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
  const available = operations.map((id) => labels[id]).filter((label): label is string => !!label);
  return `Workflows can’t ${list(categories.map((c) => reasons[c] ?? c))}. Nothing was sent.${available.length ? ` Workflows here can use: ${available.join("; ")}.` : ""}`;
}
