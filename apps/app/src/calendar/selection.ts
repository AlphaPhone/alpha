// spec/app/calendar/index.md, "The assistant is given the open event only while it shows, and the day shown only on a plain, current day"; spec/app/assistant/index.md, "The agent is told the view, the time zone, the day only from Calendar, and whether something is selected"
import { Effect, Queue, Stream } from "effect";

/**
 * What Calendar names to the agent as selected: an event of the agent's own calendar by its id and the version the
 * feed gave (eliza's `canonical-calendar-event`), an event of the phone's calendars by the revisions the phone
 * inspected (eliza's `calendar-event`), or the phone's own calendar a new event's form saves to, as the phone named it
 * (eliza's `calendar-source`). Only identifiers cross; the agent reads the record itself.
 */
export type CalendarObject =
  | { readonly kind: "canonical-calendar-event"; readonly id: string; readonly revision: string }
  | { readonly kind: "calendar-event" | "calendar-source"; readonly id: string; readonly revision: string; readonly accountId: string; readonly sourceRevision: string };

/** What Calendar gives Ask Alpha now: the civil day shown (0 for none), or the open event or the form's calendar, never both. */
export interface CalendarSubject {
  readonly day: number;
  readonly event: CalendarObject | undefined;
}

export const noSubject: CalendarSubject = { day: 0, event: undefined };

const identifier = /^[A-Za-z0-9][A-Za-z0-9._:@=+-]{0,511}$/;
const token = /^[A-Za-z0-9][A-Za-z0-9._:@=+-]{0,255}$/;
const revision = /^(?:[A-Za-z0-9][A-Za-z0-9._:@=+-]{0,255}|(?:W\/)?"[!#-~]+")$/;

/** Whether the agent's turn context admits `event` as a selected record (eliza's `SelectedObject` of `@elizaos/agent`). @throws {never} */
export function admitted(event: CalendarObject): boolean {
  if (!identifier.test(event.id) || event.revision.length > 256 || !revision.test(event.revision)) return false;
  return event.kind === "canonical-calendar-event" || (token.test(event.accountId) && token.test(event.sourceRevision));
}

/** The civil day `day` as the agent's `calendarDay` names it: `YYYY-MM-DD`. @throws {never} */
export function dateOfDay(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

const same = (a: CalendarSubject, b: CalendarSubject) => a.day === b.day && JSON.stringify(a.event) === JSON.stringify(b.event);

const inspections = new Map<number, CalendarObject>();

/** Keep what the phone's inspection numbered `ticket` named; the view's newest inspection says which one counts. @throws {never} */
export function keepInspection(ticket: number, object: CalendarObject): void {
  inspections.set(ticket, object);
  for (const older of inspections.keys()) if (older < ticket) inspections.delete(older);
}

/** What the phone's inspection numbered `ticket` named, if it answered. @throws {never} */
export function inspectionOf(ticket: number): CalendarObject | undefined {
  return inspections.get(ticket);
}

let current: CalendarSubject = noSubject;
const listeners = new Set<() => void>();

/** What Calendar last gave Ask Alpha; Calendar gives it while its view lives and clears it when the view ends. @throws {never} */
export function subjectNow(): CalendarSubject {
  return current;
}

/** Give Ask Alpha what Calendar shows now. @throws {never} */
export function giveSubject(next: CalendarSubject): void {
  if (same(next, current)) return;
  current = next;
  for (const listener of [...listeners]) listener();
}

/** Each subject Calendar gives, from the one it gives now. */
export const calendarSubjects: Stream.Stream<CalendarSubject> = Stream.callback<CalendarSubject>((queue) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const told = () => {
        Queue.offerUnsafe(queue, current);
      };
      listeners.add(told);
      told();
      return told;
    }),
    (told) => Effect.sync(() => listeners.delete(told)),
  ),
);
