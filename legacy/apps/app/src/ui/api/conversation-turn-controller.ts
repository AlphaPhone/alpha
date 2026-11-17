/**
 * Stopped-reply matching: a stopped dispatched send carries a
 * `clientMessageId`, so hosts can find its user row later
 * (see `findStoppedUserTurn`).
 */
/** A stopped send as a host recorded it: its clientMessageId, restored text and local time. */
export type StoppedUserTurn = {
  clientMessageId?: string;
  text: string;
  sentAt: number;
};
/** How far before the local send time an agent clock may stamp the same user row. */
const STOPPED_TURN_CLOCK_SKEW_MS = 120_000;

/**
 * Finds the user row of a stopped turn in a conversation read (oldest first).
 *
 * Agents return `clientMessageId` on user rows sent with one. When the read
 * carries any such id, the row is matched by id only, so an earlier turn with
 * identical text is never taken for the stopped one, and an unrecorded send
 * matches nothing. Older agents and shared-tier Cloud agents return no ids;
 * for them the last user row with the same restored text sent no earlier than
 * two minutes before the local send time is used.
 */
export function findStoppedUserTurn<T extends Record<string, unknown>>(
  messages: readonly T[],
  turn: StoppedUserTurn,
  restoredText: (text: string, userTextFormat?: unknown) => string,
): T | undefined {
  const users = messages.filter((item) => item.role === "user").reverse();
  if (
    turn.clientMessageId &&
    users.some((item) => typeof item.clientMessageId === "string")
  )
    return users.find((item) => item.clientMessageId === turn.clientMessageId);
  return users.find(
    (item) =>
      typeof item.text === "string" &&
      restoredText(item.text, item.userTextFormat) === turn.text &&
      (typeof item.timestamp !== "number" ||
        item.timestamp >= turn.sentAt - STOPPED_TURN_CLOCK_SKEW_MS),
  );
}
