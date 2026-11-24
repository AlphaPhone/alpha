import { TriangleAlert } from "lucide-react";
import { ConfirmDialog } from "../ConfirmDialog.tsx";

export type InboxLinkReviewProps = {
  /** Whether the review is up; the parent keeps it. */
  open: boolean;
  /** Where the link goes: an https address without credentials in it, shown whole. */
  destination: string;
  /** What the link's own text names, when that is another destination: a warning is shown with it. */
  claimed?: string;
  /** Opens the link in Alpha's Browser, once; the review then closes. */
  onOpen: () => void;
  /** Closes the review without opening anything. */
  onClose: () => void;
};

/**
 * The address a link in a message leads to, shown before anything opens, with a warning when the words of the link
 * name somewhere else.
 *
 * @model spec/app/inbox/message.md
 */
export function InboxLinkReview({ open, destination, claimed, onOpen, onClose }: InboxLinkReviewProps) {
  return (
    <ConfirmDialog open={open} title="Open this link?" confirmLabel="Open" destructive={claimed !== undefined} onConfirm={onOpen} onCancel={onClose}>
      <span className="block font-mono text-sm break-all text-foreground">{destination}</span>
      {claimed ? (
        <span className="mt-3 flex items-start gap-2 text-sm text-destructive">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>The link says <span className="font-mono break-all">{claimed}</span></span>
        </span>
      ) : null}
    </ConfirmDialog>
  );
}
