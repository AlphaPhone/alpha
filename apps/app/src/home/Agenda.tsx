// spec/app/home/cards.md, "Story: The agenda card"; spec/app/home/cards.md, "Story: Open my day from a card"
import { Card, CardTitle } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { useSyncExternalStore } from "react";
import * as Cards from "../../gen/app__home__cards.ts";
import { type Machine, useMachine } from "../../gen/app__home__cards.react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { named } from "./cards.vibe";

const nothingElse: Cards.Others = {
  image: false, reminders: [], hidden: [], mail: { connected: false, unread: 0, rows: [], current: false },
  messages: [], phone: [], flows: { rows: [], freshness: "UpToDate" }, brief: "NoBrief",
};

const where: Readonly<Record<Cards.Origin, string>> = { PhoneCalendar: "Phone calendar", AgentCalendar: "Agent calendar", Reminder: "Reminders" };

function when(item: Cards.Item): string {
  if (item.allDay) return "All day";
  return new Date(item.begin).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** The agenda card: what leads the day, where it was read, and whether it is up to date; a tap opens Calendar. */
export function Agenda({ runtime }: { runtime: ManagedRuntime.ManagedRuntime<Machine, unknown> }) {
  const { state, can, send } = useMachine(runtime);
  useSyncExternalStore(named.subscribe, named.snapshot, named.snapshot);
  if (!state) return null;
  const now = Math.max(state.calendar.since, state.agent.since, state.today * Cards.dayLength);
  const card = Cards.agendaCard(state, now, nothingElse);
  const first = Cards.lead(Cards.candidates(state, nothingElse), now)[0];
  if (card === "Hidden" || first === undefined) return null;
  const open = { type: "openCard", kind: "AgendaCard", now: untimed } as const;
  return (
    <Card asChild className="min-w-64 snap-start">
      <button type="button" disabled={!can(open)} onClick={() => void send(open)} className="text-left">
        <CardTitle>{named.title(first.origin, first.id) || "Event"}</CardTitle>
        <span className="text-sm text-muted-foreground">{`${when(first)} · ${where[first.origin]}`}</span>
        {card === "NotUpdated" ? <span className="text-sm text-muted-foreground">Not up to date</span> : null}
      </button>
    </Card>
  );
}
