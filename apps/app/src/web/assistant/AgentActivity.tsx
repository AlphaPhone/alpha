// spec/assistant/receipts.md, "Story: Settle an action whose outcome is unknown"; spec/assistant/receipts.md, "An action is reconciled as applied only with its exact saved receipt, and only a handoff may stay unresolved"; spec/assistant/recovery.md, "Story: Restart my agent when it stopped for review"; spec/assistant/approvals.md, "Story: Decline or let a card expire"
import { Effect, Stream } from "effect";
import { ArrowLeft, MessageSquarePlus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Composer } from "../../assistant/composer.vibe";
import { Conversations } from "../../assistant/conversations.vibe";
import { copy } from "../../assistant/presentation.vibe";
import { AgentRestart } from "../../assistant/restart.vibe";
import { DeviceReview, type HistoryItem, type HistoryOutcome } from "../../assistant/review.vibe";
import type { ProposalCard } from "../../assistant/transcript.vibe";
import { Alert, Button, Card, CardFooter, CardTitle, EmptyState, ListRow, ScrollArea, Separator } from "../components/ui/index.ts";
import { ActionCardView } from "./ActionCardView.tsx";
import { emergencyNow, restartBusyStream, restartStream } from "./services.ts";
import { act, perform, useServiceStream } from "../shell/services.ts";

/** Where Agent activity leaves to. */
export type AgentActivityProps = {
  /** Back to the conversation. */
  onBack: () => void;
};

type Loaded<A> = { readonly kind: "loading" } | { readonly kind: "failed" } | { readonly kind: "ready"; readonly value: A };

const loading = { kind: "loading" } as const;

function once<A, E, R>(work: Effect.Effect<A | undefined, E, R>): Effect.Effect<Stream.Stream<Loaded<A>>, never, R> {
  return Effect.map(Effect.context<R>(), (context) => Stream.fromEffect(Effect.provide(Effect.catchCause(
    Effect.map(work, (value): Loaded<A> => value === undefined ? { kind: "failed" } : { kind: "ready", value }),
    () => Effect.succeed<Loaded<A>>({ kind: "failed" }),
  ), context)));
}

const outcomeLabels = { happened: "Happened", didnt: "Didn’t happen", unresolved: "Leave unresolved" } as const satisfies Record<HistoryOutcome, string>;

/**
 * Agent activity: a new conversation, saved conversations, the actions waiting for me, the phone actions whose outcome I settle, and the agent's restart.
 * @model spec/assistant/receipts.md
 */
export function AgentActivity({ onBack }: AgentActivityProps) {
  const [round, setRound] = useState(0);
  const conversations = useServiceStream(`assistant/activity/conversations/${round}`,
    once(Effect.flatMap(Effect.service(Conversations), (c) => c.list())), loading);
  const history = useServiceStream(`assistant/activity/history/${round}`,
    once(Effect.flatMap(Effect.service(DeviceReview), (review) => review.history())), loading);
  const pending = useServiceStream(`assistant/activity/pending/${round}`,
    once(Effect.flatMap(Effect.service(DeviceReview), (review) => Effect.map(review.pending(), (found) => found.ok ? found.cards : undefined))), loading);
  const restartOffered = useServiceStream("assistant/restart", restartStream, false);
  const restartBusy = useServiceStream("assistant/restart-busy", restartBusyStream, false);
  const again = () => setRound((n) => n + 1);
  const openConversation = (id: string | null) => {
    act(Effect.flatMap(Effect.service(Composer), (composer) => composer.open(id, false)));
    onBack();
  };
  const settle = (item: HistoryItem, outcome: HistoryOutcome) =>
    perform(Effect.flatMap(Effect.service(DeviceReview), (review) => review.settleHistory(item.proposalId, outcome))).finally(again);
  const decide = (card: ProposalCard, approve: boolean) =>
    perform(Effect.flatMap(Effect.service(DeviceReview), (review) => approve ? review.approve(card) : review.decline(card))).finally(again);
  return (
    <section aria-label="Agent activity" className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 px-3 py-2">
        <Button size="icon" variant="ghost" aria-label="Back to chat" onClick={onBack}><ArrowLeft className="size-5" /></Button>
        <h2 className="font-serif text-xl">Agent activity</h2>
      </header>
      <ScrollArea className="min-h-0 flex-1 px-4">
        <div className="flex flex-col gap-4 pb-6">
          {restartOffered && (
            <Alert className="flex items-center justify-between gap-2" role="status">
              <span><span className="font-medium">{copy.restartNeeded}.</span> {copy.restartExplained}</span>
              <Button size="sm" disabled={restartBusy} onClick={() => perform(Effect.flatMap(Effect.service(AgentRestart), (restart) => restart.restart())).finally(again)}>{copy.restartAction}</Button>
            </Alert>
          )}
          <Button variant="outline" className="justify-start" onClick={() => openConversation(null)}><MessageSquarePlus aria-hidden className="size-4" />New conversation</Button>
          <section aria-label="Saved conversations" className="flex flex-col gap-1">
            <h3 className="font-mono text-xs uppercase text-muted-foreground">Saved conversations</h3>
            {conversations.kind === "failed" && (
              <p role="status" className="flex items-center justify-between gap-2 text-sm text-muted-foreground">{copy.conversationsUnavailable}
                <Button size="sm" variant="ghost" onClick={again}><RotateCcw aria-hidden className="size-4" />Try again</Button></p>
            )}
            {conversations.kind === "ready" && conversations.value.length === 0 && <EmptyState title="No saved conversations yet" />}
            {conversations.kind === "ready" && (
              <ul>
                {conversations.value.map((row) => (
                  <li key={row.id}><ListRow title={row.title ?? "Conversation"} detail={row.updatedAt ? new Date(row.updatedAt).toLocaleString() : undefined} onClick={() => openConversation(row.id)} /></li>
                ))}
              </ul>
            )}
          </section>
          <Separator />
          <section aria-label="Waiting for you" className="flex flex-col gap-2">
            <h3 className="font-mono text-xs uppercase text-muted-foreground">Waiting for you</h3>
            {pending.kind === "ready" && pending.value.length === 0 && <p className="text-sm text-muted-foreground">Nothing waits for your review.</p>}
            {pending.kind === "ready" && pending.value.map((card) => (
              <ActionCardView key={card.proposalId} card={card} emergency={emergencyNow()} busy={false} now={Date.now()}
                onApprove={(chosen) => decide(chosen, true)} onDecline={(chosen) => decide(chosen, false)} />
            ))}
          </section>
          <Separator />
          <section aria-label="Phone action history" className="flex flex-col gap-2">
            <h3 className="font-mono text-xs uppercase text-muted-foreground">Phone action history</h3>
            {history.kind === "failed" && (
              <p role="status" className="flex items-center justify-between gap-2 text-sm text-muted-foreground">{copy.historyUnavailable}
                <Button size="sm" variant="ghost" onClick={again}><RotateCcw aria-hidden className="size-4" />Try again</Button></p>
            )}
            {history.kind === "ready" && history.value.length === 0 && <p className="text-sm text-muted-foreground">Every phone action is settled.</p>}
            {history.kind === "ready" && history.value.map((item) => (
              <Card key={item.proposalId} className="gap-2 p-4">
                <CardTitle>{item.title}</CardTitle>
                {item.detail !== "" && <p className="text-sm text-muted-foreground">{item.detail}</p>}
                <p className="text-sm">{copy.outcomeNeedsReview}</p>
                <CardFooter className="flex-wrap gap-2">
                  {item.offers.map((outcome) => (
                    <Button key={outcome} variant={outcome === "happened" ? "primary" : "outline"} onClick={() => void settle(item, outcome)}>{outcomeLabels[outcome]}</Button>
                  ))}
                </CardFooter>
              </Card>
            ))}
          </section>
        </div>
      </ScrollArea>
    </section>
  );
}
