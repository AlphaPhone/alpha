// spec/browser/reviews.md, "Approval counts only while Alpha is shown and unlocked at the moment of the tap; Cancel, Back and Escape deny"
import type { OpenReview, ReviewKind, Reviews } from "../../../gen/browser__reviews.ts";
import { Button, Dialog, DialogContent, DialogTitle } from "../components/ui/index.ts";

/** The open Browser confirmations and the owner's answer to the newest one. */
export interface BrowserReviewProps {
  reviews: Reviews;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
}

const WORDS: Readonly<Record<ReviewKind, (detail: string) => { title: string; body: string; confirm: string; destructive: boolean }>> = {
  ClearBrowsingData: (detail) => ({ title: "Clear browsing data?", body: `Clears ${detail}.`, confirm: "Clear data", destructive: true }),
  ClearSiteData: (detail) => ({ title: `Clear data for ${detail}?`, body: `Signs you out of ${detail}.`, confirm: "Clear data", destructive: true }),
  LeavePrivate: (detail) => ({ title: "Leave private browsing?", body: `Open ${URL.parse(detail)?.hostname ?? detail} in another browser? It can keep the address and use its own accounts.\n${detail}`, confirm: "Choose browser", destructive: false }),
  BrowserControl: (detail) => ({ title: detail.split("\n")[0] ?? "Browser", body: detail.split("\n").slice(1).join("\n").trim(), confirm: "Confirm", destructive: false }),
};

/**
 * The newest open Browser confirmation.
 * @model spec/browser/reviews.md
 */
export function BrowserReview({ reviews, onApprove, onDismiss }: BrowserReviewProps) {
  const review: OpenReview | undefined = reviews.open.at(-1);
  if (review === undefined) return null;
  const words = WORDS[review.kind](review.detail);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onDismiss(review.id); }}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>{words.title}</DialogTitle>
        <p className="whitespace-pre-wrap text-sm">{words.body}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" autoFocus onClick={() => onDismiss(review.id)}>Cancel</Button>
          <Button variant={words.destructive ? "destructive" : "primary"} onClick={() => onApprove(review.id)}>{words.confirm}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
