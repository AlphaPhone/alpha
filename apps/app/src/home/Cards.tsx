// spec/app/home/cards.md, "Story: The agenda card"; spec/app/home/cards.md, "Story: The other cards"; spec/app/home/cards.md, "Story: Open my day from a card"
import { HomeAgendaCard, type HomeAgendaItem, type HomeAgendaNext, HomeBriefCard, HomeCallsCard, HomeMailCard, HomeWorkflowsCard } from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import { type ReactNode, useSyncExternalStore } from "react";
import * as Cards from "../../gen/app__home__cards.ts";
import type { Machine } from "../../gen/app__home__cards.effect.vibe";
import { useMachine } from "../../gen/app__home__cards.react.ts";
import { dayStart } from "../calendar/time.ts";
import { openCalls, openUnread } from "../phone/reports.vibe";
import { shortWhen } from "../phone/words.ts";
import type { Resident } from "../runtime/area.tsx";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { Time } from "../runtime/time.vibe";
import { fromAreas, named, others } from "./cards.vibe";

const where: Readonly<Record<Cards.Origin, string>> = { PhoneCalendar: "Calendar", AgentCalendar: "Alpha", Reminder: "Reminder" };

const clock = (at: number) => new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const day = (at: number) => new Date(at).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();
/** The time today, else the day and the time. */
const whenLabel = (at: number, now: number) => (sameDay(at, now) ? clock(at) : `${day(at)} ${clock(at)}`);
const titleOf = (item: Cards.Item) => named.title(item.origin, item.id) || "Untitled event";

function shown(item: Cards.Item, now: number): HomeAgendaItem {
  const start = clock(item.begin);
  const end = sameDay(item.begin, item.end) ? clock(item.end) : `${day(item.end)}, ${clock(item.end)}`;
  return {
    title: titleOf(item),
    when: item.overdue ? `Due ${whenLabel(item.begin, now)}` : item.allDay ? "All day" : item.end > item.begin ? `${start} – ${end}` : start,
  };
}

/** The item named under an overdue reminder: "Next:", its title and when it begins. */
function following(item: Cards.Item, now: number): HomeAgendaNext {
  const today = sameDay(item.begin, now);
  const time = item.begin <= now ? (item.allDay ? "All day" : "Now")
    : item.allDay ? (today ? "All day" : day(item.begin))
      : today ? clock(item.begin) : `${day(item.begin)} ${clock(item.begin)}`;
  return { text: `Next: ${titleOf(item)} ${time}`, source: where[item.origin] };
}

/** Why the lead item may not be up to date: its calendar's last read failed, or it was read on an earlier day. */
function readLineOf(state: Cards.Cards, item: Cards.Item, now: number): string {
  const feeds = item.origin === "PhoneCalendar" ? [state.calendar] : item.origin === "AgentCalendar" ? [state.agent] : [state.calendar, state.agent];
  const behind = feeds.find((feed) => feed.source !== "Unanswered" && (feed.source !== "Ready" || feed.day < state.today));
  if (behind === undefined) return "";
  return behind.source === "Ready" ? `Not updated since ${whenLabel(behind.since, now)}` : "Open Calendar to retry";
}

/**
 * Home's row of cards, in the spec's order and only those drawn: the agenda, Messages, Phone, Workflows, mail and the
 * brief, each from what its area told Home; a press opens the card's app. Empty when no card is drawn.
 */
export function useDayCards(runtime: ManagedRuntime.ManagedRuntime<Machine | Resident, unknown>, image: boolean): readonly ReactNode[] {
  const { state, can, send } = useTimed(runtime, useMachine);
  useSyncExternalStore(named.subscribe, named.snapshot, named.snapshot);
  const given = useSyncExternalStore(fromAreas.subscribe, fromAreas.snapshot, fromAreas.snapshot);
  if (!state) return [];
  const told = others(given, image);
  const now = Math.max(state.calendar.since, state.agent.since, dayStart(state.today));
  const latest = Math.max(now, runtime.runSync(Effect.flatMap(Time, (time) => time.latest())));
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
      const readLine = !first.overdue && Cards.agendaCard(state, now, told) === "NotUpdated" ? readLineOf(state, first, now) || "Not up to date" : undefined;
      return (
        <HomeAgendaCard
          key="agenda"
          heading={heading}
          origin={first.overdue ? undefined : where[first.origin]}
          aria-label={first.overdue ? `Open overdue reminder: ${lead.title}, ${lead.when}` : `Open calendar event: ${lead.title}, ${heading}, ${lead.when}`}
          aria-description={readLine}
          item={lead}
          next={next && following(next, now)}
          readLine={readLine}
          {...open("AgendaCard")}
        />
      );
    },
    MessagesCard: () => (
      <HomeCallsCard key="messages" app="Messages" aria-label={`Open Messages, ${given.waiting.messages || told.messages.length} unread`}
        summary={String(given.waiting.messages || told.messages.length)} status={given.waiting.messagesAt > 0 ? shortWhen(given.waiting.messagesAt, latest) : ""}
        lines={told.messages} {...open("MessagesCard")} onClick={() => void runtime.runPromise(openUnread())} />
    ),
    PhoneCard: () => (
      <HomeCallsCard key="phone" app="Phone" aria-label={given.waiting.phoneSaid ? `Open Phone, ${given.waiting.phoneSaid}` : "Open Phone"}
        summary={String(given.waiting.phone || told.phone.length)} status={given.waiting.phoneAt > 0 ? shortWhen(given.waiting.phoneAt, latest) : ""}
        lines={told.phone} {...open("PhoneCard")} onClick={() => void runtime.runPromise(openCalls())} />
    ),
    MailCard: () => <HomeMailCard key="mail" aria-label={`Open Inbox, ${told.mail.unread}${given.mailMore ? "+" : ""} unread`} unread={told.mail.unread} more={given.mailMore} lines={told.mail.rows} status={given.mailStatus || (Cards.mailCard(told.mail) === "NotUpdated" ? "Not up to date" : "")} {...open("MailCard")} />,
    BriefOfToday: () => given.brief && (
      <HomeBriefCard key="brief" outcome={given.brief.outcome} summary={given.brief.summary}
        status={`Your agent · ${given.brief.outcome === "Finished" ? "Ran" : "Failed"} ${whenLabel(given.brief.at, latest)}`} {...open("BriefOfToday")} />
    ),
    WorkflowsCard: () => <HomeWorkflowsCard key="workflows" lines={Cards.flowRows(told.flows)} more={Cards.moreFlows(told.flows)} freshness={told.flows.freshness} {...open("WorkflowsCard")} />,
  };
  return Cards.row(state, now, told).map((kind) => drawn[kind]());
}
