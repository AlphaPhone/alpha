// spec/clock/reminderTaps.md, "Story: Ask about a reminder I tapped"; spec/clock/notifications.md, "Story: Ask Alpha about one of its notifications"; spec/clock/workflowNotices.md, "A question about a notice is drafted only after its tap is read again unchanged and consumed; Cancel settles it, an interruption keeps it"
import { useState } from "react";
import { Button, Sheet, SheetContent, Textarea } from "../components/ui/index.ts";

/** The notification a question is about, exactly what will be shared, and the owner's answer. */
export type QuestionSheetProps = {
  /** Which notification the question is about, such as "Alpha Phone notification". */
  name: string;
  /** Exactly what will be shared: the notification's title and text. */
  excerpt: string;
  /** Continues with the reviewed draft, or closes with none. */
  onAnswer: (draft: string | undefined) => void;
};

/** Review a question about one notification, editable before anything reaches the conversation. */
export function QuestionSheet({ name, excerpt, onAnswer }: QuestionSheetProps) {
  const [draft, setDraft] = useState(`Help me with this notification.\n\n${excerpt}`);
  return (
    <Sheet open onOpenChange={(open) => { if (!open) onAnswer(undefined); }}>
      <SheetContent side="bottom" title={name} className="px-5 pb-6">
        <Textarea aria-label="Question" value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-40" />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onAnswer(undefined)}>Cancel</Button>
          <Button disabled={!draft.trim()} onClick={() => onAnswer(draft)}>Continue</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
