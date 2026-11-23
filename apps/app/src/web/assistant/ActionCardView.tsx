// spec/assistant/approvals.md, "Story: Approve an action card once, from wherever it is shown"; spec/assistant/approvals.md, "Story: Decline or let a card expire"; spec/assistant/approvals.md, "Decline runs nothing and works during an emergency call; Approve waits until the call ends"; spec/assistant/review.md, "A card that acts on a set it lists is offered only once it listed a non-empty set on this phone, and approved only from the latest review that listed it"
import { Check, Clock, X } from "lucide-react";
import type { PointerEvent } from "react";
import { canTapApprove, canTapDecline, initial } from "../../../gen/assistant__approvals.ts";
import { approvalExpiryText, copy } from "../../assistant/presentation.vibe";
import type { ProposalCard } from "../../assistant/transcript.vibe";
import { Button, Card, CardFooter, CardTitle } from "../components/ui/index.ts";

/** One action card, the call state it is read under, and the owner's answers to it. */
export type ActionCardViewProps = {
  /** The card as the transcript holds it. */
  card: ProposalCard;
  /** Whether an emergency call is live, which holds Approve but never Decline. */
  emergency: boolean;
  /** Whether another card's approval or decline is in flight. */
  busy: boolean;
  /** The time the expiry is shown against. */
  now: number;
  /** The owner approved the card. */
  onApprove: (card: ProposalCard) => void;
  /** The owner declined the card; nothing runs. */
  onDecline: (card: ProposalCard) => void;
  /** Open the view a navigation-only card names. */
  onOpen?: (card: ProposalCard) => void;
};

const keepFocus = (event: PointerEvent<HTMLButtonElement>) => { if (event.button === 0) event.preventDefault(); };

const settledTitles: Partial<Record<ProposalCard["state"], string>> = {
  DoneCard: "Completed", UnconfirmedCard: "Not confirmed", DeclinedCard: "Declined", ExpiredCard: copy.reviewExpiredTitle,
  UnavailableCard: copy.reviewUnavailableTitle, ReplacedCard: copy.reviewUnavailableTitle,
};

/**
 * One action the agent proposed: Approve, or Decline as a visible second button; settled cards say what happened.
 * @model spec/assistant/approvals.md
 */
export function ActionCardView({ card, emergency, busy, now, onApprove, onDecline, onOpen }: ActionCardViewProps) {
  const routes = { ...initial, card: card.state, emergency };
  const approvable = canTapApprove(routes) && !busy;
  const declinable = canTapDecline(routes) && !busy;
  const settled = settledTitles[card.state];
  const expiry = approvalExpiryText(card.expiresAt, now, undefined);
  const detail = card.state === "ExpiredCard" ? copy.reviewExpired : card.state === "UnavailableCard" || card.state === "ReplacedCard" ? copy.reviewUnavailable : card.summary ?? card.detail;
  return (
    <Card className="gap-2 p-4" aria-busy={busy || undefined}>
      <CardTitle>{settled ?? card.title}</CardTitle>
      <p className="text-sm whitespace-pre-wrap text-muted-foreground">{detail}</p>
      {card.items !== undefined && settled === undefined && (
        <ul aria-label={`What ${card.title} acts on`} className="flex flex-col gap-1 text-sm">
          {card.items.lines.map((line, at) => <li key={`${at}:${line}`} className="truncate">{line}</li>)}
          {card.items.unnamed > 0 && <li className="text-muted-foreground">{card.items.unnamed} {card.items.unnamedLabel ?? "more"}{card.items.unnamed === 1 || card.items.unnamedLabel === undefined ? "" : "s"}</li>}
        </ul>
      )}
      {settled === undefined && expiry !== "" && <p className="flex items-center gap-1 font-mono text-xs uppercase text-muted-foreground"><Clock aria-hidden className="size-3" />{expiry}</p>}
      {settled === undefined && (
        <CardFooter className="gap-2">
          {card.destination !== undefined
            ? <Button onClick={() => onOpen?.(card)} onPointerDown={keepFocus} disabled={busy}>Open</Button>
            : <Button onClick={() => onApprove(card)} onPointerDown={keepFocus} disabled={!approvable} aria-label={emergency ? copy.emergency : `Approve ${card.title}`}><Check aria-hidden className="size-4" />Approve</Button>}
          <Button variant="outline" onClick={() => onDecline(card)} onPointerDown={keepFocus} disabled={!declinable} aria-label={`Decline ${card.title}`}><X aria-hidden className="size-4" />Decline</Button>
        </CardFooter>
      )}
    </Card>
  );
}
