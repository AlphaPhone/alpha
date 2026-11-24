import { Button } from "../Button.tsx";
import { Sheet, SheetClose, SheetContent } from "../Sheet.tsx";
import { InboxNotice } from "./InboxNotice.tsx";

export type InboxSuggestionSheetProps = {
  /** Whether the sheet is up; the parent keeps it. */
  open: boolean;
  /** The text offered, in full: it goes in whole, or not at all. */
  text: string;
  /** Who offered it: Alpha's own suggestion, or text another part of Alpha handed over with "Use in email". */
  from: "alpha" | "owner";
  /** Where text from elsewhere in Alpha came from, such as Notes. */
  source?: string;
  /** Where it goes: the draft shown, or a new reply or new email started with it. */
  target: "draft" | "newReply" | "newEmail";
  /** It is too long to fit the draft: it is refused whole, never cut short, and the offer stays. */
  tooLong?: boolean;
  /** Puts it in after the text, or starts the message with it; offered only against the draft as it was last shown. */
  onAdd?: () => void;
  /** Puts it in in place of the text; offered only for a draft. */
  onReplace?: () => void;
  /** Puts the offer away; the draft is untouched and nothing is sent. */
  onDismiss: () => void;
};

/**
 * Text offered into an email, shown to the owner exactly as it would go in, to add, replace or put away.
 * Nothing Alpha suggests is sent without the owner.
 *
 * @model spec/app/inbox/suggestion.md
 */
export function InboxSuggestionSheet({ open, text, from, source, target, tooLong = false, onAdd, onReplace, onDismiss }: InboxSuggestionSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onDismiss(); }}>
      <SheetContent
        title={from === "alpha" ? "Review email suggestion" : "Use in email"}
        description={from === "alpha" ? "From Alpha" : source ? `From ${source}` : undefined}
        actions={
          <>
            <SheetClose asChild><Button variant="secondary">Dismiss</Button></SheetClose>
            {onReplace && target === "draft" ? <Button variant="outline" onClick={onReplace}>Replace</Button> : null}
            {onAdd ? <Button onClick={onAdd}>{target === "draft" ? "Add" : target === "newReply" ? "Reply" : "New email"}</Button> : null}
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="rounded-lg bg-secondary p-4 text-base break-words whitespace-pre-wrap text-secondary-foreground">{text}</p>
          {tooLong ? <InboxNotice kind="suggestionTooLong" /> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
