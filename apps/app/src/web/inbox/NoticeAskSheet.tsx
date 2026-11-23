// spec/inbox/notices.md, "Ask shows only the subject and snippet, and rechecks them before the tap is spent"
import { useState } from "react";
import type { MailNotices } from "../../../gen/inbox__notices.ts";
import { Button, Sheet, SheetContent, Textarea } from "../components/ui/index.ts";

/** What the Ask review of a tapped Gmail notice shows, and what confirming or cancelling asks for. */
export type NoticeAskSheetProps = {
  /** The notice taps as their machine holds them. */
  notices: MailNotices;
  /** What went wrong with the last confirmation, if anything. */
  failure: string;
  onConfirm: (question: string) => void;
  onCancel: (explicitDismissal: boolean) => void;
};

/**
 * The review of an Ask tap: the message's subject and snippet only, an editable question, and Ask or Not now.
 * @model spec/inbox/notices.md
 */
export function NoticeAskSheet({ notices, failure, onConfirm, onCancel }: NoticeAskSheetProps) {
  const reviewing = notices.tap === "ReviewingAsk" || notices.tap === "RecheckingAsk";
  const [question, setQuestion] = useState(`About “${notices.excerpt.subject}”: ${notices.excerpt.snippet}`);
  return (
    <Sheet open={reviewing} onOpenChange={(open) => { if (!open) onCancel(false); }}>
      <SheetContent side="bottom" title="Ask about this email">
        <div className="flex flex-col gap-3 px-5 pb-5">
          <p className="font-semibold">{notices.excerpt.subject || "(no subject)"}</p>
          <p className="text-sm text-muted-foreground">{notices.excerpt.snippet}</p>
          <Textarea aria-label="Question" value={question} onChange={(event) => setQuestion(event.currentTarget.value)} />
          {failure !== "" && <p role="alert" className="text-sm text-destructive">{failure}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onCancel(true)}>Not now</Button>
            <Button disabled={question.trim() === "" || notices.tap !== "ReviewingAsk"} loading={notices.tap === "RecheckingAsk"} onClick={() => onConfirm(question)}>Continue</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
