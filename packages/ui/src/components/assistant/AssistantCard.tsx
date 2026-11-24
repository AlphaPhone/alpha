import { AssistantActionCard, type AssistantActionCardProps } from "./AssistantActionCard.tsx";
import { AssistantAgendaCard, type AssistantAgendaCardProps } from "./AssistantAgendaCard.tsx";
import { AssistantCallCard, type AssistantCallCardProps } from "./AssistantCallCard.tsx";
import { AssistantChoicesCard, type AssistantChoicesCardProps } from "./AssistantChoicesCard.tsx";
import { AssistantDecisionCard, type AssistantDecisionCardProps } from "./AssistantDecisionCard.tsx";
import { AssistantDigestCard, type AssistantDigestCardProps } from "./AssistantDigestCard.tsx";
import { AssistantDraftCard, type AssistantDraftCardProps } from "./AssistantDraftCard.tsx";
import { AssistantEventCard, type AssistantEventCardProps } from "./AssistantEventCard.tsx";
import { AssistantGenericCard, type AssistantGenericCardProps } from "./AssistantGenericCard.tsx";
import { AssistantNoteCard, type AssistantNoteCardProps } from "./AssistantNoteCard.tsx";
import { AssistantNoticeCard, type AssistantNoticeCardProps } from "./AssistantNoticeCard.tsx";
import { AssistantPlaceCard, type AssistantPlaceCardProps } from "./AssistantPlaceCard.tsx";
import { AssistantReceiptCard, type AssistantReceiptCardProps } from "./AssistantReceiptCard.tsx";
import { AssistantRunsCard, type AssistantRunsCardProps } from "./AssistantRunsCard.tsx";
import { AssistantSummaryCard, type AssistantSummaryCardProps } from "./AssistantSummaryCard.tsx";
import { AssistantWorkflowCard, type AssistantWorkflowCardProps } from "./AssistantWorkflowCard.tsx";

type Shown<Props> = Omit<Props, "settled" | "onOpen" | "onChoose" | "onAct" | "onSave" | "onUseInEmail" | "onHandOn">;

/** What a card shows, by its kind. A card that fails its bounds or its allowlist arrives as `plain`: text, offering nothing. */
export type AssistantCardData =
  | ({ kind: "agenda" } & Shown<AssistantAgendaCardProps>)
  | ({ kind: "call" } & Shown<AssistantCallCardProps>)
  | ({ kind: "digest" } & Shown<AssistantDigestCardProps>)
  | ({ kind: "draft" } & Shown<AssistantDraftCardProps>)
  | ({ kind: "event" } & Shown<AssistantEventCardProps>)
  | ({ kind: "workflow" } & Shown<AssistantWorkflowCardProps>)
  | ({ kind: "note" } & Shown<AssistantNoteCardProps>)
  | ({ kind: "notice" } & Shown<AssistantNoticeCardProps>)
  | ({ kind: "decision" } & Shown<AssistantDecisionCardProps>)
  | ({ kind: "summary" } & Shown<AssistantSummaryCardProps>)
  | ({ kind: "place" } & Shown<AssistantPlaceCardProps>)
  | ({ kind: "choices" } & Shown<AssistantChoicesCardProps>)
  | ({ kind: "receipt" } & Shown<AssistantReceiptCardProps>)
  | ({ kind: "runs" } & Shown<AssistantRunsCardProps>)
  | ({ kind: "generic" } & Shown<AssistantGenericCardProps>)
  | ({ kind: "action" } & Shown<AssistantActionCardProps>)
  | { kind: "plain"; text: string };

export type AssistantCardProps = {
  /** The card to show. */
  card: AssistantCardData;
  /** Done with, or answered by a newer reply: the card offers nothing. */
  settled?: boolean;
  /** Opens the card's subject in its app; given for the kinds that open one. */
  onOpen?: () => void;
  /** Asks the conversation for a choice of a choices card, by its place in the list from 1. */
  onChoose?: (option: number) => void;
  /** Does what an action card asks: opens where it is done, or for a retry asks the conversation. */
  onAct?: () => void;
  /** Saves a summary to Notes. */
  onSave?: () => void;
  /** Hands a summary to a new email. */
  onUseInEmail?: () => void;
  /** Hands a proposal or a calendar change to the area that decides it. */
  onHandOn?: () => void;
};

/**
 * One card of a reply, of any kind, given the controls its kind offers. It holds no rule: the card's machine says which handlers exist and whether it is settled.
 * @model spec/app/assistant/cards.md
 */
export function AssistantCard({ card, settled, onOpen, onChoose, onAct, onSave, onUseInEmail, onHandOn }: AssistantCardProps) {
  const open = { settled, onOpen };
  switch (card.kind) {
    case "agenda": return <AssistantAgendaCard {...card} {...open} />;
    case "call": return <AssistantCallCard {...card} {...open} />;
    case "digest": return <AssistantDigestCard {...card} {...open} />;
    case "draft": return <AssistantDraftCard {...card} {...open} />;
    case "event": return <AssistantEventCard {...card} {...open} />;
    case "workflow": return <AssistantWorkflowCard {...card} {...open} />;
    case "note": return <AssistantNoteCard {...card} {...open} />;
    case "place": return <AssistantPlaceCard {...card} {...open} />;
    case "receipt": return <AssistantReceiptCard {...card} {...open} />;
    case "runs": return <AssistantRunsCard {...card} {...open} />;
    case "notice": return <AssistantNoticeCard {...card} />;
    case "generic": return <AssistantGenericCard {...card} />;
    case "decision": return <AssistantDecisionCard {...card} settled={settled} onHandOn={onHandOn} />;
    case "summary": return <AssistantSummaryCard {...card} settled={settled} onSave={onSave} onUseInEmail={onUseInEmail} />;
    case "choices": return <AssistantChoicesCard {...card} settled={settled} onChoose={onChoose} />;
    case "action": return <AssistantActionCard {...card} settled={settled} onAct={onAct} />;
    case "plain": return <p className="text-base break-words whitespace-pre-line">{card.text}</p>;
    default: {
      const _exhaustive: never = card;
      return _exhaustive;
    }
  }
}
