/**
 * Review copy for a scheduled phone workflow whose local time a forward clock change skips.
 *
 * The time-zone offset arithmetic is the shared `zoneOffsetMinutes` in
 * `@elizaos/contracts/phone-workflow`, which the agent's own schedule admission also uses; this
 * module only finds the skipped day for the review and words it.
 */
import {
  type PhoneTimeTrigger,
  zoneOffsetMinutes,
} from "@elizaos/contracts/phone-workflow";

const DAY_MS = 86_400_000,
  MINUTE_MS = 60_000;
const wallClock = (localMs: number) =>
  new Date(localMs).toISOString().slice(11, 16);
/**
 * A scheduled local time that does not exist on a clock-change day (the hour
 * skipped when clocks move forward) never comes due that day: no run starts.
 * Names the next such day within a year, or returns "". Review copy only; the
 * agent's own schedule admission is unchanged. The review already names the
 * time zone, so the note does not repeat it.
 */
export function phoneTriggerClockChangeNote(
  trigger: PhoneTimeTrigger,
  now = Date.now(),
): string {
  try {
    const [hour, minute] = trigger.localTime.split(":").map(Number);
    const target = hour * 60 + minute;
    let at = Math.floor(now / MINUTE_MS) * MINUTE_MS,
      offset = zoneOffsetMinutes(at, trigger.timeZone);
    for (let day = 0; day < 371; day++) {
      const next = at + DAY_MS,
        nextOffset = zoneOffsetMinutes(next, trigger.timeZone);
      if (nextOffset > offset) {
        // Minute-precise transition instant: the first minute already on the later offset.
        let low = at,
          high = next;
        while (high - low > MINUTE_MS) {
          const mid =
            low + Math.floor((high - low) / MINUTE_MS / 2) * MINUTE_MS;
          if (zoneOffsetMinutes(mid, trigger.timeZone) === offset) low = mid;
          else high = mid;
        }
        const gapStart = high + offset * MINUTE_MS,
          gapEnd = high + nextOffset * MINUTE_MS;
        for (const edge of [gapStart, gapEnd - MINUTE_MS]) {
          const midnight = Math.floor(edge / DAY_MS) * DAY_MS,
            candidate = midnight + target * MINUTE_MS;
          if (
            candidate >= gapStart &&
            candidate < gapEnd &&
            trigger.days.includes(new Date(midnight).getUTCDay())
          )
            return `On ${new Date(midnight).toISOString().slice(0, 10)} the clock moves forward from ${wallClock(gapStart)} to ${wallClock(gapEnd)}, so ${trigger.localTime} does not occur and this workflow does not run that day.`;
        }
      }
      at = next;
      offset = nextOffset;
    }
  } catch {
    /* An unknown zone is refused by the shared trigger contract; no note. */
  }
  return "";
}
