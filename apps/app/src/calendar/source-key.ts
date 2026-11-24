// The two pure helpers of @elizaos/plugin-calendar's model that the renderer uses. The package root is the agent plugin:
// importing it loads the agent runtime and its Node-only modules into the page. Copied from the pinned upstream
// packages/plugin-calendar/src/model.vibe until upstream exports them from a client entry; keep them identical.
import type { CalendarSourceKey } from "@elizaos/plugin-calendar"

const canonicalInstant = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/

/** A canonical UTC instant string as milliseconds, or undefined for anything else. @throws {never} */
export function utcInstant(value: unknown): number | undefined {
  if (typeof value !== "string" || !canonicalInstant.test(value)) return undefined
  const stamp = Date.parse(value)
  return Number.isFinite(stamp) && new Date(stamp).toISOString() === value ? stamp : undefined
}

/** One string per calendar source key. @throws {never} */
export function sourceKeyId(key: CalendarSourceKey): string {
  return JSON.stringify([key.provider, key.side, key.grantId, key.connectorAccountId, key.calendarId])
}
