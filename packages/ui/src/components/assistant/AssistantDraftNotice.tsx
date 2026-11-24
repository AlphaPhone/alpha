import type { ComponentProps } from "react";
import { Alert } from "../Alert.tsx";
import { Banner } from "../Banner.tsx";
import { Button } from "../Button.tsx";
import { Spinner } from "../Spinner.tsx";

export type AssistantDraftNoticeProps = Omit<ComponentProps<"div">, "children"> & {
  /**
   * What is wrong with the draft: its slot is being opened, a save failed, the slot is damaged or cannot be read, a
   * different copy is saved, or a message may already have been sent and is under review.
   */
  status: "opening" | "failed" | "damaged" | "unreadable" | "conflict" | "review";
  /** The copy saved in the slot, shown while the owner chooses between it and the text being written. */
  saved?: string;
  /** Saves the draft again after storage failed. */
  onRetry?: () => void;
  /** Recovers a damaged slot. */
  onRecover?: () => void;
  /** Opens a slot that could not be read once more. */
  onReopen?: () => void;
  /** Puts the saved copy in the composer. */
  onRestoreSaved?: () => void;
  /** Keeps the text being written and saves it over the saved copy. */
  onKeepCurrent?: () => void;
  /** Reads the conversation once to see whether a message under review arrived. */
  onCheck?: () => void;
};

/**
 * What the owner must know or choose about the saved draft, above the field: the slot opening, storage failing with Retry,
 * a damaged slot with Recover, two copies to choose between, a message that may already have been sent.
 * @model spec/app/assistant/composer.md
 */
export function AssistantDraftNotice({ status, saved, onRetry, onRecover, onReopen, onRestoreSaved, onKeepCurrent, onCheck, ...props }: AssistantDraftNoticeProps) {
  const small = (label: string, onClick: (() => void) | undefined, variant: "primary" | "outline" = "outline") =>
    onClick ? <Button variant={variant} size="sm" onClick={onClick}>{label}</Button> : null;
  if (status === "opening") return <Banner {...props}><span className="flex items-center gap-2"><Spinner size="sm" label="Opening draft" />Opening your draft</span></Banner>;
  if (status === "failed") return <Banner variant="warn" action={small("Retry", onRetry)} {...props}>Draft not saved</Banner>;
  if (status === "damaged") return <Banner variant="warn" action={small("Recover", onRecover)} {...props}>Draft damaged</Banner>;
  if (status === "unreadable") return <Banner variant="warn" action={small("Try again", onReopen)} {...props}>Draft cannot be read</Banner>;
  const review = status === "review";
  return (
    <Alert role="note" variant="warn" {...props}>
      <div className="flex flex-col gap-3">
        <p>{review ? "This message may already have been sent" : "A different draft is saved"}</p>
        {saved ? <p className="line-clamp-3 border-l-2 border-border pl-3 break-words text-muted-foreground">{saved}</p> : null}
        <div className="flex flex-wrap gap-2">
          {review ? small("Check for reply", onCheck, "primary") : null}
          {small("Restore saved", onRestoreSaved)}
          {small("Keep current", onKeepCurrent)}
        </div>
      </div>
    </Alert>
  );
}
