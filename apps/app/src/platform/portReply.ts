/**
 * The JSON object an installed page's port answered `requestId` with, or `undefined` for any other message: one that is
 * not text, longer than `limit`, not JSON, or the answer to another request. @throws {never}
 */
export function replyTo(event: Event, requestId: string, limit = Number.POSITIVE_INFINITY): object | undefined {
  if (!(event instanceof MessageEvent) || typeof event.data !== "string" || event.data.length > limit) return undefined;
  let reply: unknown;
  try { reply = JSON.parse(event.data); } catch { return undefined; }
  return typeof reply === "object" && reply !== null && "requestId" in reply && reply.requestId === requestId ? reply : undefined;
}
