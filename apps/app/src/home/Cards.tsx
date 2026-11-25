// spec/app/home/cards.md, "Story: The agenda card"; spec/app/home/cards.md, "Story: The other cards"; spec/app/home/cards.md, "Story: Open my day from a card"
import { HomeAgendaCard, type HomeAgendaItem, HomeBriefCard, HomeCallsCard, HomeMailCard, HomeWorkflowsCard } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { type ReactNode, useSyncExternalStore } from "react";
import * as Cards from "../../gen/app__home__cards.ts";
import type { Machine } from "../../gen/app__home__cards.effect.vibe";
import { useMachine } from "../../gen/app__home__cards.react.ts";
import { openCalls, openUnread } from "../phone/reports.vibe";
import { shortWhen } from "../phone/words.ts";
import type { Resident } from "../runtime/area.tsx";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { type MailRead, type Waiting, fromAreas, named, others } from "./cards.vibe";

const where: Readonly<Record<Cards.Origin, string>> = { PhoneCalendar: "Calendar", AgentCalendar: "Alpha", Reminder: "Reminder" };

const clock = (at: number) => new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** When the mail was read, as v121's overviewWhenLabel: the time today, else the date and the time. */
const readWhen = (at: number, now: number) =>
  new Date(at).toDateString() === new Date(now).toDateString()
    ? clock(at)
    : `${new Date(at).toLocaleDateString([], { month: "short", day: "numeric" })} ${clock(at)}`;

/** The mail card's foot, as v121's: "Recent email" for a page that did not see every message, else the account, and when it was read. */
const mailFoot = (read: MailRead | undefined, now: number) =>
  read && [read.more ? "Recent email" : read.account, read.at > 0 ? `Updated ${readWhen(read.at, now)}` : ""].filter(Boolean).join(" · ");

/** A Messages or Phone card's count and the time of its newest row, as v121's, and its name with what waits. */
const waitingOf = (app: "Messages" | "Phone", waiting: Waiting | undefined, now: number) =>
  waiting && { summary: String(waiting.count), status: shortWhen(waiting.at, now), "aria-label": `${app}, ${waiting.what}` };

function shown(item: Cards.Item): HomeAgendaItem {
  return {
    title: named.title(item.origin, item.id) || "Event",
    when: item.allDay ? "All day" : item.overdue ? `Due ${clock(item.begin)}` : clock(item.begin),
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
      const lead = shown(first);
      const next = first.overdue ? Cards.following(items, now)[0] : undefined;
      return <HomeAgendaCard key="agenda" aria-label={first.overdue ? `Open overdue reminder: ${lead.title}` : `Open calendar event: ${lead.title}`} item={lead} overdue={first.overdue} next={next && shown(next)} notCurrent={Cards.agendaCard(state, now, told) === "NotUpdated"} {...open("AgendaCard")} />;
    },
    MessagesCard: () => <HomeCallsCard key="messages" app="Messages" lines={told.messages} {...waitingOf("Messages", given.messagesWaiting, Date.now())} {...open("MessagesCard")} onClick={() => void runtime.runPromise(openUnread())} />,
    PhoneCard: () => <HomeCallsCard key="phone" app="Phone" lines={told.phone} {...waitingOf("Phone", given.phoneWaiting, Date.now())} {...open("PhoneCard")} onClick={() => void runtime.runPromise(openCalls())} />,
    MailCard: () => <HomeMailCard key="mail" unread={told.mail.unread} more={given.mailRead?.more} status={mailFoot(given.mailRead, Date.now())} lines={told.mail.rows} notCurrent={Cards.mailCard(told.mail) === "NotUpdated"} {...open("MailCard")} />,
    BriefOfToday: () => given.brief && (
      <HomeBriefCard key="brief" outcome={given.brief.outcome} summary={given.brief.outcome === "Finished" ? given.brief.summary : undefined} when={clock(given.brief.at)} {...open("BriefOfToday")} />
    ),
    WorkflowsCard: () => <HomeWorkflowsCard key="workflows" lines={Cards.flowRows(told.flows)} more={Cards.moreFlows(told.flows)} freshness={told.flows.freshness} {...open("WorkflowsCard")} />,
  };
  return Cards.row(state, now, told).map((kind) => drawn[kind]());
}
