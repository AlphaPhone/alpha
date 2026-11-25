// spec/app/home/cards.md, "Story: The agenda card"; spec/app/home/cards.md, "Story: The other cards"; spec/app/home/cards.md, "Story: Open my day from a card"
import { HomeAgendaCard, type HomeAgendaItem, HomeBriefCard, HomeCallsCard, HomeMailCard, HomeWorkflowsCard } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { type ReactNode, useSyncExternalStore } from "react";
import * as Cards from "../../gen/app__home__cards.ts";
import type { Machine } from "../../gen/app__home__cards.effect.vibe";
import { useMachine } from "../../gen/app__home__cards.react.ts";
import { openCalls, openUnread } from "../phone/reports.vibe";
import type { Resident } from "../runtime/area.tsx";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { fromAreas, named, others } from "./cards.vibe";

const where: Readonly<Record<Cards.Origin, string>> = { PhoneCalendar: "Calendar", AgentCalendar: "Alpha", Reminder: "Reminder" };

const clock = (at: number) => new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const day = (at: number) => new Date(at).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

function shown(item: Cards.Item, now: number): HomeAgendaItem {
  const start = clock(item.begin);
  const due = sameDay(item.begin, now) ? start : `${day(item.begin)} ${start}`;
  const end = sameDay(item.begin, item.end) ? clock(item.end) : `${day(item.end)}, ${clock(item.end)}`;
  return {
    title: named.title(item.origin, item.id) || "Event",
    when: item.overdue ? `Due ${due}` : item.allDay ? "All day" : item.end > item.begin ? `${start} – ${end}` : start,
    source: where[item.origin],
  };
}

/**
 * Home's row of cards, in the spec's order and only those drawn: the agenda, Messages, Phone, mail, the brief and
 * Workflows, each from what its area told Home; a press opens the card's app. Empty when no card is drawn.
 */
export function useDayCards(runtime: ManagedRuntime.ManagedRuntime<Machine | Resident, unknown>, image: boolean): readonly ReactNode[] {
  const { state, can, send } = useTimed(runtime, useMachine);
  useSyncExternalStore(named.subscribe, named.snapshot, named.snapshot);
  const given = useSyncExternalStore(fromAreas.subscribe, fromAreas.snapshot, fromAreas.snapshot);
  if (!state) return [];
  const told = others(given, image);
  const now = Math.max(state.calendar.since, state.agent.since, state.today * Cards.dayLength);
  const open = (kind: Cards.Kind) => ({
    disabled: !can({ type: "openCard", kind, now }),
    onClick: () => void send({ type: "openCard", kind, now: untimed }),
  });
  const drawn: Record<Cards.Kind, () => ReactNode> = {
    AgendaCard: () => {
      const items = Cards.candidates(state, told);
      const first = Cards.lead(items, now)[0];
      if (first === undefined) return null;
      const lead = shown(first, now);
      const next = first.overdue ? Cards.following(items, now)[0] : undefined;
      const overdueCount = items.filter((item) => item.overdue).length;
      const heading = first.overdue ? (overdueCount > 1 ? `${overdueCount} overdue reminders` : "Overdue reminder") : day(first.begin);
      const notCurrent = Cards.agendaCard(state, now, told) === "NotUpdated";
      return (
        <HomeAgendaCard
          key="agenda"
          heading={heading}
          aria-label={first.overdue ? `Open overdue reminder: ${lead.title}, ${lead.when}` : `Open calendar event: ${lead.title}, ${heading}, ${lead.when}`}
          aria-description={notCurrent ? "Not up to date" : undefined}
          item={lead}
          overdue={first.overdue}
          next={next && shown(next, now)}
          notCurrent={notCurrent}
          {...open("AgendaCard")}
        />
      );
    },
    MessagesCard: () => <HomeCallsCard key="messages" app="Messages" lines={told.messages} {...open("MessagesCard")} onClick={() => void runtime.runPromise(openUnread())} />,
    PhoneCard: () => <HomeCallsCard key="phone" app="Phone" lines={told.phone} {...open("PhoneCard")} onClick={() => void runtime.runPromise(openCalls())} />,
    MailCard: () => <HomeMailCard key="mail" aria-label={`Open Inbox, ${told.mail.unread}${given.mailMore ? "+" : ""} unread`} unread={told.mail.unread} more={given.mailMore} lines={told.mail.rows} notCurrent={Cards.mailCard(told.mail) === "NotUpdated"} {...open("MailCard")} />,
    BriefOfToday: () => given.brief && (
      <HomeBriefCard key="brief" outcome={given.brief.outcome} summary={given.brief.outcome === "Finished" ? given.brief.summary : undefined} when={clock(given.brief.at)} {...open("BriefOfToday")} />
    ),
    WorkflowsCard: () => <HomeWorkflowsCard key="workflows" lines={Cards.flowRows(told.flows)} more={Cards.moreFlows(told.flows)} freshness={told.flows.freshness} {...open("WorkflowsCard")} />,
  };
  return Cards.row(state, now, told).map((kind) => drawn[kind]());
}
