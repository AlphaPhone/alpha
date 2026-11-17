/**
 * What a Calendar approval card says: the line that describes a queued Calendar change, and the
 * result after the owner approves or declines it.
 *
 * The agent's Calendar plugin queues each change with a reason sentence
 * (`plugins/plugin-calendar/src/actions/mutation-approval.ts`) and answers a resolution with an
 * outcome sentence (`calendarApprovalOutcome` in `plugins/plugin-calendar/src/mutations/resolve.ts`).
 * Neither is shown, in the review or above its card in the conversation. The request line is Alpha's, built from the reviewed payload; only the event
 * title is read from the queued reason (data the agent recorded, not copy), and only when the
 * reason matches one of the reviewed templates. The result is keyed on the reply's kind and
 * failure code; a completed reply's operation, title and duplicate flag are read from the reviewed
 * template as data. Anything else reads as Alpha's sentence for that kind.
 */

type Payload = Record<string, unknown>;
export type CalendarApprovalAction = "schedule_event" | "modify_event" | "cancel_event";
export type CalendarApprovalOutcomeKind = "succeeded" | "rejected" | "invalidated" | "retryable" | "blocked";

const NOT_MADE = "Nothing changed in Calendar";

/** Alpha's sentence for each refusal code an invalidated change names (upstream `OWNER_REASONS`). */
export const CALENDAR_APPROVAL_INVALIDATED: ReadonlyMap<string, string> = new Map([
  ["CALENDAR_MANAGED_TARGET_CHANGED", `${NOT_MADE}: the event changed after you reviewed it.`],
  ["CALENDAR_SYNC_PRECONDITION", `${NOT_MADE}: the event changed after you reviewed it.`],
  ["CALENDAR_MANAGED_ACCOUNT_CHANGED", `${NOT_MADE}: the Calendar account changed.`],
  ["CALENDAR_MANAGED_EDITOR_REQUIRED", `${NOT_MADE}. Review this event in Calendar instead.`],
  ["CALENDAR_SYNC_REVIEW_REQUIRED", `${NOT_MADE}. Review this event in Calendar instead.`],
  ["CALENDAR_MANAGED_WRITE_UNAVAILABLE", `${NOT_MADE}: Alpha couldn’t confirm it may edit this calendar.`],
]);

/** Alpha's sentence for each code a blocked (unconfirmed) resolution names. */
export const CALENDAR_APPROVAL_BLOCKED: ReadonlyMap<string, string> = new Map([
  ["CALENDAR_REVIEW_IN_PROGRESS", "This Calendar change is still being made. Check Calendar again shortly."],
  ["CALENDAR_REVIEW_UNCONFIRMED", "Calendar change is not confirmed. Check its saved status before trying again."],
]);

/** Alpha's sentence for each outcome kind when the reply names nothing more specific. */
export const CALENDAR_APPROVAL_FALLBACK: Readonly<Record<CalendarApprovalOutcomeKind, string>> = {
  succeeded: "Calendar change completed.",
  rejected: `Declined. ${NOT_MADE}.`,
  invalidated: `${NOT_MADE}. Review the current event.`,
  retryable: `${NOT_MADE}. You can try again.`,
  blocked: "Calendar change is not confirmed. Check its saved status before trying again.",
};

const quoted = (title: string) => `“${title}”`;
const cancelVerb = (payload: Payload | undefined) =>
  payload?.cancellationMode === "decline_invitation"
    ? "Declined"
    : payload?.cancellationMode === "remove_private_copy"
      ? "Removed"
      : payload?.cancellationMode === "organizer_cancel"
        ? "Cancelled"
        : "Cancelled or declined";

/** The completed reply's reviewed template: duplicate flag, operation and event title. */
const COMPLETED = /^(Already completed|Completed) Calendar (schedule event|modify event|cancel event): ([\s\S]+)\.$/;
const NO_TITLE = "the reviewed event";

function completedText(text: unknown, payload: Payload | undefined): string | null {
  if (typeof text !== "string") return null;
  const match = COMPLETED.exec(text);
  if (!match) return null;
  const already = match[1] === "Already completed",
    title = match[3] === NO_TITLE ? "" : match[3].trim(),
    target = title ? quoted(title) : "this event";
  const sentence =
    match[2] === "schedule event"
      ? `added ${target} to Calendar.`
      : match[2] === "modify event"
        ? `changed ${target} in Calendar.`
        : `${cancelVerb(payload).toLowerCase()} ${target}${payload?.cancellationMode === "remove_private_copy" ? " from your calendar" : ""}.`;
  return already ? `Already ${sentence}` : sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/**
 * Alpha's sentence for a Calendar approval resolution. `text` is the agent's outcome sentence,
 * read only as the reviewed completed template; `payload` is the reviewed request's payload.
 */
export function calendarApprovalOutcomeText(
  kind: CalendarApprovalOutcomeKind,
  failure: { code?: unknown } | undefined,
  text?: unknown,
  payload?: Payload,
): string {
  const code = typeof failure?.code === "string" ? failure.code : "";
  if (kind === "succeeded") return completedText(text, payload) ?? CALENDAR_APPROVAL_FALLBACK.succeeded;
  if (kind === "invalidated") return CALENDAR_APPROVAL_INVALIDATED.get(code) ?? CALENDAR_APPROVAL_FALLBACK.invalidated;
  if (kind === "blocked") return CALENDAR_APPROVAL_BLOCKED.get(code) ?? CALENDAR_APPROVAL_FALLBACK.blocked;
  return CALENDAR_APPROVAL_FALLBACK[kind];
}

/**
 * The queued reason's reviewed templates, in the order `enqueueCalendarApproval` builds them. Each
 * names where the event title sits; nothing else is read from the reason.
 */
const NOTIFY = "(?: and notify attendees| without sending attendee notifications)";
const VERB = "(?:Cancel|Decline the invitation for)";
const STAMP = "\\S+";
const REASON_TEMPLATES: readonly RegExp[] = [
  // schedule_event
  new RegExp(`^Create "([\\s\\S]*)" at ${STAMP} on calendar "[\\s\\S]*"(?: with a \\d+-minute travel buffer)?, (?:and notify attendees|without sending attendee notifications)\\.$`),
  new RegExp(`^Create "([\\s\\S]*)" as an all-day event from ${STAMP} through ${STAMP} \\(exclusive\\) on calendar "[\\s\\S]*"(?: with a \\d+-minute travel buffer)?, (?:and notify attendees|without sending attendee notifications)\\.$`),
  // modify_event
  new RegExp(`^Modify "([\\s\\S]*)" from ${STAMP} forward by splitting the recurring series\\. Later per-occurrence exceptions will reset(?:, and attendees may receive both split update notifications)?\\.$`),
  new RegExp(`^Modify every occurrence of the recurring series "([\\s\\S]*)" \\(not only ${STAMP}\\)${NOTIFY}\\.$`),
  new RegExp(`^Modify "([\\s\\S]*)" on ${STAMP}${NOTIFY}\\.$`),
  // cancel_event
  new RegExp(`^${VERB} "([\\s\\S]*)" from ${STAMP} forward by truncating the recurring series; every later occurrence and exception will be removed(?:, and attendees will be notified)?\\.$`),
  new RegExp(`^${VERB} every occurrence of the recurring series "([\\s\\S]*)" \\(not only ${STAMP}\\); every occurrence and exception will be removed(?:, and attendees will be notified)?\\.$`),
  new RegExp(`^${VERB} "([\\s\\S]*)" on ${STAMP}${NOTIFY}\\.$`),
];

/** The event title a reason line names when it matches a reviewed template; else null. */
function reasonTitle(line: string): string | null {
  for (const template of REASON_TEMPLATES) {
    const match = template.exec(line);
    if (match) return match[1].trim();
  }
  return null;
}

/** The event title a queued reason names, when it matches a reviewed template; else "". */
export function calendarApprovalReasonTitle(reason: string): string {
  return reasonTitle(reason.split(/\r?\n/, 1)[0] ?? "") ?? "";
}

/**
 * The line shown above a Calendar approval card. The agent replies with the queued reason
 * sentence, which carries UTC timestamps and calendar ids; when the reply's prose is exactly that
 * sentence, Alpha's own line replaces it. Any other prose is shown as written.
 */
export function calendarApprovalCardText(prose: string): string {
  const title = /[\r\n]/.test(prose) ? null : reasonTitle(prose);
  if (title === null) return prose;
  return title ? `Review this Calendar change: ${quoted(title)}.` : "Review this Calendar change.";
}

/**
 * Alpha's line describing a queued Calendar change, from the reviewed payload. The title is the
 * payload's for a new event, else the one the queued reason names, else `currentTitle` (the
 * event Alpha matched on this phone), else "this event".
 */
export function calendarApprovalRequestText(
  action: CalendarApprovalAction,
  payload: Payload,
  reason: string,
  currentTitle?: string,
): string {
  if (action === "schedule_event") {
    const title = typeof payload.title === "string" && payload.title.trim() ? payload.title.trim() : calendarApprovalReasonTitle(reason);
    return `Add ${title ? quoted(title) : "this event"} to Calendar.`;
  }
  const named = calendarApprovalReasonTitle(reason) || currentTitle?.trim() || "";
  const target = named ? quoted(named) : "this event";
  const scope = payload.recurrenceScope;
  if (action === "modify_event") {
    if (scope === "this_and_following")
      return `Change ${target} from this occurrence on. The repeating event is split, and changes made to single later occurrences are reset.${payload.notifyAttendees === true ? " Guests may get two update emails." : ""}`;
    if (scope === "series") return `Change every occurrence of ${target}, not only the one shown.`;
    if (scope === "instance") return `Change only this occurrence of ${target}.`;
    return `Change ${target}.`;
  }
  const verb =
    payload.cancellationMode === "decline_invitation"
      ? "Decline"
      : payload.cancellationMode === "remove_private_copy"
        ? "Remove"
        : "Cancel";
  const from = payload.cancellationMode === "remove_private_copy" ? " from your calendar" : "";
  if (scope === "this_and_following")
    return `${verb} ${target}${from} from this occurrence on. Every later occurrence and its changes are removed.`;
  if (scope === "series") return `${verb} every occurrence of ${target}${from}. Every occurrence and its changes are removed.`;
  if (scope === "instance") return `${verb} only this occurrence of ${target}${from}.`;
  return `${verb} ${target}${from}.`;
}
