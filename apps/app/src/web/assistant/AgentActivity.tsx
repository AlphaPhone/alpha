// spec/assistant/receipts.md, "Story: Settle an action whose outcome is unknown"; spec/assistant/receipts.md, "An action is reconciled as applied only with its exact saved receipt, and only a handoff may stay unresolved"; spec/assistant/recovery.md, "Story: Restart my agent when it stopped for review"; spec/assistant/approvals.md, "Story: Decline or let a card expire"
import { Effect, Stream } from "effect";
import { useState } from "react";
import { DeviceEnrollment } from "../../account/enrollment.vibe";
import { Composer } from "../../assistant/composer.vibe";
import { Conversations } from "../../assistant/conversations.vibe";
import { AgentRestart } from "../../assistant/restart.vibe";
import { DeviceReview } from "../../assistant/review.vibe";
import type { ProposalCard } from "../../assistant/transcript.vibe";
import { AgentActivityView, type Loaded } from "./AgentActivityView.tsx";
import { emergencyNow, restartBusyStream, restartStream } from "./services.ts";
import { act, perform, useServiceStream } from "../shell/services.ts";

/** Where Agent activity leaves to. */
export type AgentActivityProps = {
  /** Back to the conversation. */
  onBack: () => void;
};

const loading = { kind: "loading" } as const;

function once<A, E, R>(work: Effect.Effect<A | undefined, E, R>): Effect.Effect<Stream.Stream<Loaded<A>>, never, R> {
  return Effect.map(Effect.context<R>(), (context) => Stream.fromEffect(Effect.provide(Effect.catchCause(
    Effect.map(work, (value): Loaded<A> => value === undefined ? { kind: "failed" } : { kind: "ready", value }),
    () => Effect.succeed<Loaded<A>>({ kind: "failed" }),
  ), context)));
}

/** Whether the phone is chat only: its enrollment with the agent failed for this connection (spec/account/enrollment.md). */
const chatOnlyStream = Effect.map(Effect.service(DeviceEnrollment), (enrollment) =>
  Stream.map(Stream.concat(Stream.fromEffect(enrollment.current()), enrollment.changes), (now) => now.phase === "ChatOnly"));

/**
 * Agent activity over the runtime: a new conversation, saved conversations, the actions waiting for me, the phone actions whose outcome I settle, and the agent's restart.
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
  const chatOnly = useServiceStream("assistant/activity/chat-only", chatOnlyStream, false);
  const restartBusy = useServiceStream("assistant/restart-busy", restartBusyStream, false);
  const again = () => setRound((n) => n + 1);
  const openConversation = (id: string | null) => {
    act(Effect.flatMap(Effect.service(Composer), (composer) => composer.open(id, false)));
    onBack();
  };
  const decide = (card: ProposalCard, approve: boolean) =>
    perform(Effect.flatMap(Effect.service(DeviceReview), (review) => approve ? Effect.asVoid(review.approve(card)) : Effect.asVoid(review.decline(card)))).finally(again);
  return (
    <AgentActivityView
      conversations={conversations} pending={pending} history={history}
      restartOffered={restartOffered} restartBusy={restartBusy} chatOnly={chatOnly} emergency={emergencyNow()} now={Date.now()}
      onBack={onBack}
      onRetry={again}
      onOpenConversation={openConversation}
      onRestart={() => perform(Effect.flatMap(Effect.service(AgentRestart), (restart) => restart.restart())).finally(again)}
      onApprove={(card) => decide(card, true)}
      onDecline={(card) => decide(card, false)}
      onSettle={(item, outcome) => void perform(Effect.flatMap(Effect.service(DeviceReview), (review) => review.settleHistory(item.proposalId, outcome))).finally(again)}
    />
  );
}
