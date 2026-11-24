// spec/assistant/receipts.md, "Story: Settle an action whose outcome is unknown"; spec/assistant/receipts.md, "An action is reconciled as applied only with its exact saved receipt, and only a handoff may stay unresolved"; spec/assistant/recovery.md, "Story: Restart my agent when it stopped for review"; spec/assistant/recovery.md, "Story: Start my agent again when it would not start"; spec/assistant/approvals.md, "Story: Decline or let a card expire"
import { ArrowLeft, MessageSquarePlus, RotateCcw } from "lucide-react";
import type { ConversationRow } from "../../assistant/payloads.schema.vibe";
import { copy, offerText } from "../../assistant/presentation.vibe";
import type { RestartOffer } from "../../assistant/restart.vibe";
import type { HistoryItem, HistoryOutcome } from "../../assistant/review.vibe";
import type { ProposalCard } from "../../assistant/transcript.vibe";
import { Alert, Button, Card, CardFooter, CardTitle, EmptyState, ListRow, ScrollArea, Separator } from "../components/ui/index.ts";
import { ActionCardView } from "./ActionCardView.tsx";

/** One read of Agent activity: still loading, failed, or ready with what it read. */
export type Loaded<A> = { readonly kind: "loading" } | { readonly kind: "failed" } | { readonly kind: "ready"; readonly value: A };

/** What Agent activity read, what governs its controls, and the owner's answers to it. */
export type AgentActivityViewProps = {
  /** The saved conversations, as the resident listed them. */
  conversations: Loaded<readonly ConversationRow[]>;
  /** The action cards waiting for the owner's review. */
  pending: Loaded<readonly ProposalCard[]>;
  /** The phone actions whose outcome the owner settles. */
  history: Loaded<readonly HistoryItem[]>;
  /** Restart Alpha for an agent the service holds for review, or Try again for one that would not start. */
  restartOffer: RestartOffer;
  /** A restart or a try is running. */
  restartBusy: boolean;
  /** The phone's enrollment failed for this connection, so it is chat only. */
  chatOnly: boolean;
  /** An emergency call is live, which holds every Approve. */
  emergency: boolean;
  /** The time card expiries are shown against. */
  now: number;
  /** Back to the conversation. */
  onBack: () => void;
  /** Read every section again. */
  onRetry: () => void;
  /** Open a saved conversation, or a new one for null. */
  onOpenConversation: (id: string | null) => void;
  /** The owner tapped Restart Alpha or Try again. */
  onRestart: () => void;
  /** The owner approved a waiting card. */
  onApprove: (card: ProposalCard) => void;
  /** The owner declined a waiting card; nothing runs. */
  onDecline: (card: ProposalCard) => void;
  /** The owner said what happened to a past phone action. */
  onSettle: (item: HistoryItem, outcome: HistoryOutcome) => void;
};

/** Legacy's reason for a phone the agent cannot act on, with what brings phone actions back. */
const CHAT_ONLY = "Chat only. Phone actions come back when your agent reconnects.";

const outcomeLabels = { happened: "Happened", didnt: "Didn’t happen", unresolved: "Leave unresolved" } as const satisfies Record<HistoryOutcome, string>;

/**
 * Agent activity as it was read: a new conversation, saved conversations, the cards waiting for me, the phone actions whose outcome I settle, and the agent's restart.
 */
export function AgentActivityView(props: AgentActivityViewProps) {
  const { conversations, pending, history, restartOffer, restartBusy, chatOnly, emergency, now, onBack, onRetry, onOpenConversation, onRestart, onApprove, onDecline, onSettle } = props;
  const offered = restartOffer.kind === "none" ? undefined : offerText(restartOffer.kind === "retry" ? restartOffer.refusal : undefined);
  return (
    <section aria-label="Agent activity" className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 px-3 py-2">
        <Button size="icon" variant="ghost" aria-label="Back to chat" onClick={onBack}><ArrowLeft className="size-5" /></Button>
        <h2 className="font-display text-xl">Agent activity</h2>
      </header>
      <ScrollArea className="min-h-0 flex-1 px-4">
        <div className="flex flex-col gap-4 pb-6">
          {offered && (
            <Alert className="flex items-center justify-between gap-2" role="status">
              <span><span className="font-medium">{offered.title}.</span> {offered.explained}</span>
              <Button size="sm" disabled={restartBusy} onClick={onRestart}>{offered.action}</Button>
            </Alert>
          )}
          <Button variant="outline" className="justify-start" onClick={() => onOpenConversation(null)}><MessageSquarePlus aria-hidden className="size-4" />New conversation</Button>
          <section aria-label="Saved conversations" className="flex flex-col gap-1">
            <h3 className="font-mono text-xs uppercase text-muted-foreground">Saved conversations</h3>
            {conversations.kind === "failed" && (
              <p role="status" className="flex items-center justify-between gap-2 text-sm text-muted-foreground">{copy.conversationsUnavailable}
                <Button size="sm" variant="ghost" onClick={onRetry}><RotateCcw aria-hidden className="size-4" />Try again</Button></p>
            )}
            {conversations.kind === "ready" && conversations.value.length === 0 && <EmptyState title="No saved conversations yet" />}
            {conversations.kind === "ready" && (
              <ul>
                {conversations.value.map((row) => (
                  <li key={row.id}><ListRow title={row.title ?? "Conversation"} detail={row.updatedAt ? new Date(row.updatedAt).toLocaleString() : undefined} onClick={() => onOpenConversation(row.id)} /></li>
                ))}
              </ul>
            )}
          </section>
          <Separator />
          <section aria-label="Waiting for you" className="flex flex-col gap-2">
            <h3 className="font-mono text-xs uppercase text-muted-foreground">Waiting for you</h3>
            {chatOnly && <p role="status" className="text-sm text-muted-foreground">{CHAT_ONLY}</p>}
            {pending.kind === "ready" && pending.value.length === 0 && <p className="text-sm text-muted-foreground">Nothing waits for your review.</p>}
            {pending.kind === "ready" && pending.value.map((card) => (
              <ActionCardView key={card.proposalId} card={card} emergency={emergency} busy={false} now={now} onApprove={onApprove} onDecline={onDecline} />
            ))}
          </section>
          <Separator />
          <section aria-label="Phone action history" className="flex flex-col gap-2">
            <h3 className="font-mono text-xs uppercase text-muted-foreground">Phone action history</h3>
            {history.kind === "failed" && (
              <p role="status" className="flex items-center justify-between gap-2 text-sm text-muted-foreground">{copy.historyUnavailable}
                <Button size="sm" variant="ghost" onClick={onRetry}><RotateCcw aria-hidden className="size-4" />Try again</Button></p>
            )}
            {history.kind === "ready" && history.value.length === 0 && <p className="text-sm text-muted-foreground">Every phone action is settled.</p>}
            {history.kind === "ready" && history.value.map((item) => (
              <Card key={item.proposalId} className="gap-2 p-4">
                <CardTitle>{item.title}</CardTitle>
                {item.detail !== "" && <p className="text-sm text-muted-foreground">{item.detail}</p>}
                <p className="text-sm">{copy.outcomeNeedsReview}</p>
                <CardFooter className="flex-wrap gap-2">
                  {item.offers.map((outcome) => (
                    <Button key={outcome} variant={outcome === "happened" ? "primary" : "outline"} onClick={() => onSettle(item, outcome)}>{outcomeLabels[outcome]}</Button>
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
