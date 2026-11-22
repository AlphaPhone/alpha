/**
 * What Calendar says when the shared calendar API client
 * (`plugins/plugin-calendar/src/api/calendar-api.ts`, which Alpha binds to its agent in
 * `runtime/agent-calendar-client.ts`) refuses a write before sending it. Each sentence it throws
 * is worded by Alpha here; the client's text is never shown.
 */

/** Keyed by every sentence `createCalendarApi` throws. */
export const CALENDAR_API_REFUSALS: ReadonlyMap<string, string> = new Map([
  ["Calendar event creation requires a stable idempotencyKey.", "This event couldn’t be saved safely. Nothing changed; try again."],
  ["Calendar event update requires expectedProviderVersion.", "Refresh this event before changing it. Nothing changed."],
  ["Calendar event update requires a stable idempotencyKey.", "This change couldn’t be saved safely. Nothing changed; try again."],
  ["Calendar event deletion requires expectedProviderVersion.", "Refresh this event before deleting it. Nothing was deleted."],
  ["Calendar event deletion requires a stable idempotencyKey.", "This deletion couldn’t be sent safely. Nothing was deleted; try again."],
  ["Calendar event deletion requires an explicit cancellationMode.", "Choose how to cancel this event before deleting it. Nothing was deleted."],
  ["Calendar invitation response requires expectedProviderVersion.", "Refresh this invitation before replying. No response was sent."],
  ["Calendar invitation response requires a stable idempotencyKey.", "Your response couldn’t be sent safely. Try again."],
]);
