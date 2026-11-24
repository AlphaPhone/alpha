// spec/telephony/comms.md, "A proposal restored from the phone's own store is shown, never approved, until Alpha proposes it again"; spec/assistant/approvals.md, "A card restored from the phone's own store is shown but never executed"
import type { OpenCard } from "../../telephony/comms.vibe";
import { Button, Card } from "../components/ui/index.ts";

export interface RestoredProposalProps {
  /** The open proposal and its kept words; nothing is shown for a live one, which is the chat's own card. */
  card: OpenCard | null;
  /** Dismiss the restored proposal; nothing runs. */
  onDismiss: (proposalId: string) => void;
}

/**
 * What Alpha had proposed before the phone restarted: its title and detail, read only, with Dismiss and no button that acts.
 * @design design.md
 */
export function RestoredProposal({ card, onDismiss }: RestoredProposalProps) {
  if (card === null || card.live) return null;
  const title = card.words?.title.trim() || "Alpha's suggestion";
  return (
    <Card role="status" aria-label={`Saved suggestion: ${title}`} className="mx-4 mb-2 flex flex-col gap-1 px-4 py-3">
      <span className="font-mono text-xs uppercase text-muted-foreground">Saved from before</span>
      <span className="font-medium break-words">{title}</span>
      {card.words?.detail && <span className="whitespace-pre-line text-sm text-muted-foreground break-words">{card.words.detail}</span>}
      <span className="text-sm text-muted-foreground">Ask Alpha again to act on it.</span>
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => onDismiss(card.proposalId)}>Dismiss</Button>
      </div>
    </Card>
  );
}
