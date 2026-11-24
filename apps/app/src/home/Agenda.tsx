// spec/app/home/cards.md, "Story: The agenda card"; spec/app/home/cards.md, "Story: Open my day from a card"
import { HomeAgendaCard, type HomeAgendaItem } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { useSyncExternalStore } from "react";
import * as Cards from "../../gen/app__home__cards.ts";
import type { Machine } from "../../gen/app__home__cards.effect.vibe";
import { useMachine } from "../../gen/app__home__cards.react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { agendaFrom, named } from "./cards.vibe";

/** The agenda's part of what other areas hold; their own cards are drawn at `home/cards`. */
const others = (told: ReturnType<typeof agendaFrom.snapshot>): Cards.Others => ({
  image: false, reminders: [...told.reminders], hidden: [...told.hidden], mail: { connected: false, unread: 0, rows: [], current: false },
  messages: [], phone: [], flows: { rows: [], freshness: "UpToDate" }, brief: "NoBrief",
});

const where: Readonly<Record<Cards.Origin, string>> = { PhoneCalendar: "Calendar", AgentCalendar: "Alpha", Reminder: "Reminder" };
const time = (date: Date) => date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const day = (date: Date) => date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

function shown(item: Cards.Item, now: number): HomeAgendaItem {
  const begin = new Date(item.begin);
  const end = new Date(item.end);
  const start = time(begin);
  const sameDay = begin.toDateString() === end.toDateString();
  const due = begin.toDateString() === new Date(now).toDateString() ? start : `${day(begin)} ${start}`;
  const span = item.end > item.begin ? `${start} – ${sameDay ? time(end) : `${day(end)}, ${time(end)}`}` : start;
  return {
    title: named.title(item.origin, item.id) || "Event",
    when: item.overdue ? `Due ${due}` : item.allDay ? "All day" : span,
    source: where[item.origin],
  };
}

/** The agenda card: what leads the day, the next item under an overdue reminder, and whether it is up to date; a tap opens Calendar. */
export function Agenda({ runtime }: { runtime: ManagedRuntime.ManagedRuntime<Machine, unknown> }) {
  const { state, can, send } = useMachine(runtime);
  useSyncExternalStore(named.subscribe, named.snapshot, named.snapshot);
  const told = others(useSyncExternalStore(agendaFrom.subscribe, agendaFrom.snapshot, agendaFrom.snapshot));
  if (!state) return null;
  const now = Math.max(state.calendar.since, state.agent.since, state.today * Cards.dayLength);
  const card = Cards.agendaCard(state, now, told);
  const items = Cards.candidates(state, told);
  const first = Cards.lead(items, now)[0];
  if (card === "Hidden" || first === undefined) return null;
  const next = first.overdue ? Cards.following(items, now)[0] : undefined;
  const overdueCount = items.filter((item) => item.overdue).length;
  const heading = first.overdue ? (overdueCount > 1 ? `${overdueCount} overdue reminders` : "Overdue reminder") : day(new Date(first.begin));
  const item = shown(first, now);
  const open = { type: "openCard", kind: "AgendaCard", now } as const;
  return (
    <HomeAgendaCard
      item={item}
      heading={heading}
      aria-label={first.overdue ? `Open overdue reminder: ${item.title}, ${item.when}` : `Open calendar event: ${item.title}, ${heading}, ${item.when}`}
      aria-description={card === "NotUpdated" ? "Not up to date" : undefined}
      overdue={first.overdue}
      next={next && shown(next, now)}
      notCurrent={card === "NotUpdated"}
      disabled={!can(open)}
      onClick={() => void send(open)}
    />
  );
}
