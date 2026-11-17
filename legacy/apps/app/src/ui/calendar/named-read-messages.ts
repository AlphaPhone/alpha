/**
 * What the chat receipt says after the agent asked to share a Calendar event by name. The shared
 * read (`executeNamedCalendarRead` in plugin-calendar `client/named-read.ts`) answers with a
 * status and its own English summary; Alpha keys a table on that reviewed summary and shows its
 * own sentence. A summary Alpha has no sentence for reads as the status's sentence.
 */

/** Keyed by every summary `named-read.ts` returns. */
export const NAMED_CALENDAR_READ_SUMMARIES: ReadonlyMap<string, string> = new Map([
  [
    "Choose the exact matching event in Calendar before sharing it. Nothing was shared or changed.",
    "Open the matching event in Calendar first, then ask again. Nothing was shared or changed.",
  ],
  [
    "The event was not shared. Its selection, access or review changed; nothing was changed.",
    "The event wasn’t shared because its selection, access or review changed. Nothing was changed.",
  ],
  [
    "The selected event does not match the requested name. Nothing was shared or changed.",
    "The open event doesn’t match the name you asked about. Nothing was shared or changed.",
  ],
  [
    "Shared the matching event you chose. Its requested update still requires a separate review.",
    "Shared the event you chose. Any change you asked for needs its own review.",
  ],
]);

/** Alpha's sentence for a result whose summary is not in the table, by its status. */
export const NAMED_CALENDAR_READ_FALLBACK = {
  succeeded: "Shared the event you chose.",
  failed: "The event wasn’t shared. Nothing was changed.",
} as const;

/** Alpha's summary for a named Calendar read result; the shared summary is never returned. */
export function namedCalendarReadSummary(result: { status: string; summary?: unknown }): string {
  const summary = typeof result.summary === "string" ? result.summary.trim() : "";
  return (
    NAMED_CALENDAR_READ_SUMMARIES.get(summary) ??
    (result.status === "succeeded" ? NAMED_CALENDAR_READ_FALLBACK.succeeded : NAMED_CALENDAR_READ_FALLBACK.failed)
  );
}
