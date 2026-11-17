/**
 * Reviewed foreground free/busy read on the phone or in the browser.
 *
 * The owner picks the calendars, the device reads only those, the owner sees the
 * exact result, and the same read is repeated before sharing so a calendar that
 * changed during review is never reported. Free, cancelled and declined entries
 * are not busy; tentative entries count conservatively (the shared
 * `calendarAvailability` computation). An unavailable, stale or remote read with
 * unknown freshness is unknown, never free. Every failure shares nothing.
 *
 * Alpha owns the flow and every sentence the owner reads; the provider port, the
 * review hook contract and the source and event parsers stay upstream. The host
 * supplies the provider, the review UI and the clock.
 */
import {
  CALENDAR_AVAILABILITY_MAX_BUSY,
  CALENDAR_AVAILABILITY_MAX_CALENDARS,
  type CalendarAvailabilityOperation,
  type CalendarAvailabilityResult,
  calendarAvailability,
  validateCalendarAvailabilityOperation,
} from "@elizaos/contracts";
import { currentClockTimeZone } from "@elizaos/plugin-assistant/device-clock-review";
import {
  abortablePause,
  type AvailabilityOutcome,
  type AvailabilityProvider,
  type AvailabilityReview,
  parseAvailabilityEvents,
  parseAvailabilitySources,
  SOURCE_LIST_ATTEMPTS,
  SOURCE_LIST_RETRY_MS,
} from "@elizaos/plugin-calendar/client/availability-review";

const NOTHING = " Nothing was shared.";
const failed = (summary: string): AvailabilityOutcome => ({
  status: "failed",
  summary: summary + NOTHING,
});
const ZONE_CHANGED =
  "This availability check used a different time zone. Ask again from this phone.";
const DENIED = "Calendar access was not allowed, so no calendar was read.";

function readFailure(status: string): AvailabilityOutcome {
  if (status === "freshness-unknown" || status === "stale")
    return failed(
      "Calendar freshness could not be verified, so your availability is unknown.",
    );
  if (status === "permission-required") return failed(DENIED);
  if (status === "changed")
    return failed(
      "A chosen calendar changed on this phone. Review the availability check again.",
    );
  if (status === "timezone-changed") return failed(ZONE_CHANGED);
  if (status === "too-many")
    return failed(
      `These calendars have more than ${CALENDAR_AVAILABILITY_MAX_BUSY} events in this window. Ask about a shorter time or choose fewer calendars.`,
    );
  return failed("Calendars could not be read right now.");
}

/** Owner-facing sentence for the journal and chat receipt. Carries no event content. */
function describeAvailabilityResult(
  result: CalendarAvailabilityResult,
): string {
  const calendars = `${result.calendarCount} calendar${result.calendarCount === 1 ? "" : "s"} you chose`;
  const ignored = result.transparentIgnored
    ? ` ${result.transparentIgnored} event${result.transparentIgnored === 1 ? "" : "s"} marked free ${result.transparentIgnored === 1 ? "was" : "were"} ignored.`
    : "";
  return result.status === "free"
    ? `Shared that you are free in this window, from ${calendars}.${ignored} No event titles or details were shared.`
    : `Shared ${result.busy.length} busy time${result.busy.length === 1 ? "" : "s"} from ${calendars}.${ignored} No event titles or details were shared.`;
}

/**
 * Bounded foreground free/busy read. `current` throws when the session, screen
 * or device context is no longer the reviewed one.
 */
export async function executeCalendarAvailability(
  provider: AvailabilityProvider,
  value: CalendarAvailabilityOperation,
  contextTimeZone: string | undefined,
  signal: AbortSignal,
  current: () => void,
  review: AvailabilityReview,
  // The context zone is normalized the same way, so a "+00:00" device reads as "UTC" on both sides.
  deviceTimeZone: () => string = currentClockTimeZone,
  pause: (
    milliseconds: number,
    signal: AbortSignal,
  ) => Promise<void> = abortablePause,
): Promise<AvailabilityOutcome> {
  try {
    const operation = validateCalendarAvailabilityOperation(value);
    const stable = () => {
      signal.throwIfAborted();
      current();
    };
    // All-day events block the owner's local civil days, so every zone involved must agree.
    const sameZone = () =>
      contextTimeZone === operation.timeZone &&
      deviceTimeZone() === operation.timeZone;
    stable();
    if (!sameZone()) return failed(ZONE_CHANGED);
    const permission = await provider.requestWorkflowReadAccess();
    stable();
    if (permission.status !== "granted") return failed(DENIED);
    // The system permission prompt takes window focus, and the native read
    // requires it. Focus may return a moment after the prompt resolves, so an
    // unavailable list is asked for again a bounded number of times. Each
    // attempt re-checks the reviewed context; nothing is read.
    let listed = await provider.availabilitySources({
      timeZone: operation.timeZone,
    });
    stable();
    for (
      let attempt = 1;
      listed.status === "unavailable" && attempt < SOURCE_LIST_ATTEMPTS;
      attempt++
    ) {
      await pause(SOURCE_LIST_RETRY_MS, signal);
      stable();
      listed = await provider.availabilitySources({
        timeZone: operation.timeZone,
      });
      stable();
    }
    if (listed.status === "permission-required") return failed(DENIED);
    if (listed.status === "timezone-changed") return failed(ZONE_CHANGED);
    if (listed.status !== "ready")
      return failed("Calendars are unavailable right now.");
    if (listed.timeZone !== operation.timeZone || !sameZone())
      return failed(ZONE_CHANGED);
    const sources = parseAvailabilitySources(listed.calendars);
    if (!sources.length)
      return failed("No readable calendars were found on this phone.");
    const chosenIds = await review.chooseCalendars(
      sources,
      operation,
      signal,
      stable,
    );
    if (chosenIds === null)
      return failed("Availability check cancelled. No calendar was read.");
    stable();
    if (
      !Array.isArray(chosenIds) ||
      chosenIds.length < 1 ||
      chosenIds.length > CALENDAR_AVAILABILITY_MAX_CALENDARS ||
      new Set(chosenIds).size !== chosenIds.length
    )
      throw Error("Invalid calendar choice");
    const chosen = chosenIds.map((id) => {
      const source = sources.find((item) => item.id === id);
      if (!source) throw Error("A chosen calendar was not offered");
      return source;
    });
    const request = {
      calendars: chosen.map((source) => ({
        id: source.id,
        revision: source.sourceRevision,
      })),
      start: operation.start,
      end: operation.end,
      timeZone: operation.timeZone,
    };
    const read = async (): Promise<
      CalendarAvailabilityResult | AvailabilityOutcome
    > => {
      const answer = await provider.readAvailability(request);
      stable();
      if (answer.status !== "ready") return readFailure(answer.status);
      if (answer.freshness !== "local") return readFailure("freshness-unknown");
      if (!sameZone()) return failed(ZONE_CHANGED);
      return calendarAvailability(
        operation,
        chosen.length,
        parseAvailabilityEvents(answer.events),
      );
    };
    const reviewed = await read();
    if ("summary" in reviewed) return reviewed;
    if (!(await review.confirmResult(reviewed, chosen, signal, stable)))
      return failed("Availability check cancelled.");
    stable();
    // The shared answer is the one the owner saw: a calendar that changed since is reviewed again.
    const latest = await read();
    if ("summary" in latest) return latest;
    if (JSON.stringify(latest) !== JSON.stringify(reviewed))
      return failed(
        "Your calendar changed during this review. Review the availability check again.",
      );
    stable();
    return {
      status: "succeeded",
      summary: describeAvailabilityResult(reviewed),
      foregroundResult: reviewed,
    };
  } catch {
    // A read has no device effect, so any interruption is a plain failure, never an unknown outcome.
    return failed(
      signal.aborted
        ? "Availability check cancelled."
        : "The phone, calendars or connection changed before this availability check finished.",
    );
  }
}
