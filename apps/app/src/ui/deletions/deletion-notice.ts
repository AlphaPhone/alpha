/**
 * What the pending-deletion Undo notice and the deletion reviews say: the notice's row and status
 * text, the Undo-too-late result, and the refusal shown when a review proves nothing was queued.
 *
 * The Undo window itself (its clock, deadline, claim rules, notice phases and receipt check) is the
 * shared `@elizaos/contracts/deletion-window` contract; this module only presents its rows.
 */
import type { DeferredDeletionEntry } from "@elizaos/contracts/deletion-window";

export const UNDO_TOO_LATE =
  "Undo was too late. The deletion already went ahead; check the item before relying on it.";

export const DELETION_NOTICE_TEXT = {
  paused:
    "Deletion paused. Undo to keep it, then review again if you still want to delete.",
  queued: "Deletion queued for 10 seconds.",
  uncertain: "Deletion outcome needs review and won't be repeated.",
  verifying: "Deletion is being verified.",
  statusUnavailable:
    "Pending deletion status is unavailable. Refresh before making another change.",
  undoUnconfirmed:
    "Undo could not be confirmed. The deletion may already have gone ahead; refresh and inspect the saved item.",
  refreshing:
    "Refreshing the saved receipt. This does not repeat the deletion or prove the item was restored.",
  dismissed:
    "Outcome dismissed. The receipt is retained; nothing was restored or repeated.",
  dismissFailed:
    "The outcome could not be dismissed. Refresh the receipt and try again.",
} as const;

interface DeletionNotice {
  key: string;
  title: string;
  message: string;
  canUndo: boolean;
  /** Dispatch may have happened: offer receipt refresh and dismissal, never a replay. */
  uncertain: boolean;
}

/** Presentation of one pending row. Undo is offered while the window is open or paused. */
export function deletionNotice(entry: DeferredDeletionEntry): DeletionNotice {
  const uncertain = entry.phase === "unknown" || entry.phase === "dispatching";
  const paused = entry.phase === "paused" || entry.window === "clock-changed";
  const canUndo =
    paused || (entry.phase === "queued" && entry.window === "open");
  return {
    key: `${entry.kind}:${entry.id}`,
    title:
      entry.target.row?.title ||
      entry.target.fields?.title ||
      entry.original?.title ||
      `Selected ${entry.kind}`,
    message: paused
      ? DELETION_NOTICE_TEXT.paused
      : canUndo
        ? DELETION_NOTICE_TEXT.queued
        : uncertain
          ? DELETION_NOTICE_TEXT.uncertain
          : DELETION_NOTICE_TEXT.verifying,
    canUndo,
    uncertain,
  };
}

/**
 * Review statuses that prove nothing was claimed or staged, with the message shown for each.
 * `unknown` is not listed: it remains an uncertain outcome.
 */
function deletionReviewRefusal(status: string): string | undefined {
  switch (status) {
    case "stale":
      return "This item changed. Review it again before deleting.";
    case "unavailable":
      return "Deletion review is unavailable. Open the item and try again; nothing changed.";
    case "not-staged":
      return "Deletion was not queued. Nothing changed; review it again if you still want to delete it.";
    default:
      return undefined;
  }
}

/** The reminder wording of {@link deletionReviewRefusal}. */
export function reminderDeletionRefusal(status: string): string | undefined {
  switch (status) {
    case "stale":
      return "This reminder changed. Review it again before deleting.";
    case "unavailable":
      return "Deletion review is unavailable. Open the reminder and try again; nothing changed.";
    default:
      return deletionReviewRefusal(status);
  }
}
