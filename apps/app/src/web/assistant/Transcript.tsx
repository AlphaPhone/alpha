// spec/assistant/reply.md, "Story: Read a reply with its cards"; spec/assistant/receipts.md, "A receipt's title says what the journal proves"; spec/assistant/conversation.md, "Only a recorded message of this session that is settled can be quoted, and only my own can be edited, from an empty composer"
import type { MapsCard } from "@elizaos/plugin-maps/cards";
import { CircleAlert, CircleCheck, CircleHelp, Paperclip, Quote as QuoteIcon, SquarePen } from "lucide-react";
import { editable, quotable } from "../../../gen/assistant__conversation.ts";
import { copy, cutOffText, planCardTitle } from "../../assistant/presentation.vibe";
import type { ProposalCard, Quote, Row } from "../../assistant/transcript.vibe";
import { Button, EmptyState, Spinner } from "../components/ui/index.ts";
import { cn } from "../lib/cn.ts";
import { ActionCardView } from "./ActionCardView.tsx";
import { ReplyText } from "./ReplyText.tsx";
import { EmailCardView } from "./EmailCardView.tsx";

/** The rows of the open conversation, what governs their controls, and the owner's answers to them. */
export type TranscriptProps = {
  /** The rows, oldest first. */
  rows: readonly Row[];
  /** A reply is being written. */
  typing: boolean;
  /** The composer holds text, so no message can be edited. */
  draftEmpty: boolean;
  /** The resident can fork a conversation. */
  canFork: boolean;
  /** The Cloud's display name, for plan cards. */
  cloud: string;
  /** An emergency call is live, which holds every Approve. */
  emergency: boolean;
  /** The card whose approval or decline is in flight. */
  busyCard?: string;
  /** The time expiries are shown against. */
  now: number;
  /** Shown when nothing was said yet. */
  emptyText: string;
  /** Quote a message in the next reply. */
  onQuote: (quote: Quote) => void;
  /** Correct one of my messages. */
  onEdit: (row: Extract<Row, { kind: "user" }>) => void;
  /** Approve an action card. */
  onApprove: (card: ProposalCard) => void;
  /** Decline an action card. */
  onDecline: (card: ProposalCard) => void;
  /** Open the view a navigation card names. */
  onOpenCard: (card: ProposalCard) => void;
  /** Answer a reply's choice with its value. */
  onChoose: (value: string) => void;
  /** Act on a reply's plan card. */
  onPlan: (row: Extract<Row, { kind: "agent" }>) => void;
  /** Open a workflow run a reply announced. */
  onOpenRun: (workflowId: string, runId: string) => void;
  /** Open the map of a Maps card in the agent message counted `ordinal`. */
  onOpenMap?: (card: MapsCard, ordinal: number) => void;
  /** The selected Inbox account's address, shown for an email card's "me". */
  ownAddress?: string;
  /** An email card's fields changed, was sent or was declined. */
  onEmail: (row: Extract<Row, { kind: "email" }>, act: "edit" | "send" | "decline", fields: { readonly to: string; readonly subject: string; readonly body: string }) => void;
};

const receiptIcon = { Completed: CircleCheck, "Not confirmed": CircleHelp, "Not completed": CircleAlert } as const;

/**
 * The open conversation: my messages, Alpha's replies with their cards, receipts and notices.
 * @model spec/assistant/reply.md
 */
export function Transcript(props: TranscriptProps) {
  const { rows, typing } = props;
  if (rows.length === 0) return <EmptyState title={props.emptyText} className="py-12" />;
  const newestAgent = rows.findLast((row) => row.kind === "agent")?.id;
  return (
    <ol className="flex flex-col gap-3" aria-live="polite">
      {rows.map((row) => {
        switch (row.kind) {
          case "user": {
            const facts = { recorded: row.status === "recorded", sameSession: true, settledRow: true, mine: true };
            return (
              <li key={row.id} data-alpha-message-id={row.id} className="flex flex-col items-end gap-1">
                {row.quote && <p className="flex max-w-4/5 items-center gap-1 text-xs text-muted-foreground"><QuoteIcon aria-hidden className="size-3" />{row.quote.from === "user" ? "You" : "Alpha"}: {row.quote.text.replace(/\s+/g, " ").slice(0, 160)}</p>}
                <div className={cn("max-w-4/5 rounded-xl bg-primary px-4 py-2 text-primary-foreground", row.status === "pending" && "opacity-70")}>
                  <p className="font-legible whitespace-pre-wrap">{row.text}</p>
                  {row.files.map((file) => <p key={file.id} className="flex items-center gap-1 text-xs"><Paperclip aria-hidden className="size-3" />{file.name}</p>)}
                </div>
                {row.status === "unconfirmed" && <p className="text-xs text-warn">{copy.maybeSent}</p>}
                <div className="flex gap-1">
                  {quotable(facts, typing) && <Button size="icon" variant="ghost" aria-label="Reply to this message" onClick={() => props.onQuote({ messageId: row.id, text: row.text, from: "user" })}><QuoteIcon className="size-4" /></Button>}
                  {editable(facts, typing, props.draftEmpty, props.canFork) && <Button size="icon" variant="ghost" aria-label="Edit this message" onClick={() => props.onEdit(row)}><SquarePen className="size-4" /></Button>}
                </div>
              </li>
            );
          }
          case "agent":
            return (
              <li key={row.id} data-alpha-message-id={row.id} className="flex flex-col items-start gap-2">
                {row.reply.status === "Planning" || (row.reply.status === "Working" && row.text === "")
                  ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size="sm" aria-hidden />{row.label ?? "Thinking"}</p>
                  : <ReplyText segments={row.segments} onChoose={props.onChoose} onOpenRun={props.onOpenRun}
                      live={row.id === newestAgent && row.ordinal !== undefined && !typing}
                      onOpenMap={props.onOpenMap === undefined || row.ordinal === undefined ? undefined : (card) => props.onOpenMap?.(card, row.ordinal ?? 0)} />}
                {row.notices.map((notice) => <p key={notice} className="text-sm text-muted-foreground">{notice}</p>)}
                {row.cutOff !== "NotCutOff" && <p className="font-mono text-xs uppercase text-muted-foreground">{cutOffText(row.cutOff)}</p>}
                {row.plan !== undefined && <Button variant="outline" onClick={() => props.onPlan(row)}>{planCardTitle(row.plan, props.cloud)}</Button>}
                {row.recorded && row.reply.status === "Settled" && quotable({ recorded: true, sameSession: true, settledRow: true, mine: false }, typing) &&
                  <Button size="icon" variant="ghost" aria-label="Reply to this message" onClick={() => props.onQuote({ messageId: row.id, text: row.text, from: "agent" })}><QuoteIcon className="size-4" /></Button>}
              </li>
            );
          case "receipt": {
            const Icon = receiptIcon[row.title as keyof typeof receiptIcon] ?? CircleHelp;
            return <li key={row.id} className="flex items-start gap-2 text-sm"><Icon aria-label={row.title} className="mt-0.5 size-4 shrink-0" /><span>{row.summary}</span></li>;
          }
          case "notice":
            return <li key={row.id} role="status" className="text-sm text-muted-foreground">{row.text}</li>;
          case "email":
            return <li key={row.id}><EmailCardView card={row.card} to={row.to} subject={row.subject} body={row.body} ownAddress={props.ownAddress}
              onEdit={(fields) => props.onEmail(row, "edit", fields)} onSend={(fields) => props.onEmail(row, "send", fields)}
              onDecline={() => props.onEmail(row, "decline", { to: row.to, subject: row.subject, body: row.body })} /></li>;
          case "card":
            return <li key={row.id}><ActionCardView card={row.card} emergency={props.emergency} busy={props.busyCard !== undefined && props.busyCard !== row.card.proposalId} now={props.now} onApprove={props.onApprove} onDecline={props.onDecline} onOpen={props.onOpenCard} /></li>;
        }
      })}
    </ol>
  );
}
