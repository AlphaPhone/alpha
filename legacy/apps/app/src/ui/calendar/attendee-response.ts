/**
 * Alpha's word for a guest's reply on an agent Calendar event. The resident agent's Calendar feed
 * (plugin-calendar LifeOps events) carries each attendee's `responseStatus` as the provider's
 * wire value: Google's `needsAction`, `accepted`, `tentative` and `declined`
 * (`GoogleCalendarAttendeeResponseStatus` in plugin-google-workspace), or a lowercased iCalendar
 * `PARTSTAT` from an imported feed. Alpha words each here and never shows the wire value.
 */
export const ATTENDEE_RESPONSE_LABELS: ReadonlyMap<string, string> = new Map([
  ["needsAction", "Awaiting reply"],
  ["needs-action", "Awaiting reply"],
  ["accepted", "Going"],
  ["tentative", "Maybe"],
  ["declined", "Declined"],
  ["delegated", "Delegated"],
]);

/**
 * The people-list status for an attendee: "Organizer" for the organizer, else Alpha's word for
 * the reply; a reply Alpha has no word for reads as "Invited", and no reply shows nothing.
 */
export function attendeeResponseLabel(guest: { organizer?: unknown; responseStatus?: unknown }): string {
  if (guest.organizer) return "Organizer";
  const status = typeof guest.responseStatus === "string" ? guest.responseStatus.trim() : "";
  if (!status) return "";
  return ATTENDEE_RESPONSE_LABELS.get(status) ?? "Invited";
}
