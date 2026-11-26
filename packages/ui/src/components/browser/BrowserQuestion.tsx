import { useRef } from "react";
import { Button } from "../Button.tsx";
import { Dialog, DialogContent, DialogTitle } from "../Dialog.tsx";
import { Textarea } from "../Textarea.tsx";

export type BrowserQuestionProps = {
  readonly source: string;
  readonly question: string;
  readonly excerpt: string;
  readonly ready: boolean;
  readonly status?: string;
  readonly onQuestion: (text: string) => void;
  readonly onExcerpt: (text: string) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
};

const field = "mt-1.5 mb-4 block w-full field-sizing-fixed resize rounded-lg border-border bg-secondary/45 px-3 py-3 text-md leading-plain focus:outline-2 focus:outline-offset-2 focus:outline-alpha focus:outline-solid dark:bg-secondary/50";
const action = "h-auto min-h-11 min-w-0 basis-[calc(50%-0.25rem)] grow justify-start whitespace-normal rounded-full border border-transparent bg-foreground/7 px-3 py-2 text-md font-normal text-foreground";

/** The selected Browser source and its editable words before adding the question to chat. */
export function BrowserQuestion({ source, question, excerpt, ready, status, onQuestion, onExcerpt, onConfirm, onCancel }: BrowserQuestionProps) {
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent aria-label="Ask about selected content" aria-labelledby={undefined} aria-describedby={undefined}
        onOpenAutoFocus={(event) => { event.preventDefault(); fieldRef.current?.focus(); }}
        onInteractOutside={(event) => event.preventDefault()}
        overlayClassName="bg-foreground/10 dark:bg-background/10"
        className="inset-x-auto top-1/2 bottom-auto left-1/2 m-0 max-h-[calc(100dvh-2.375rem)] w-[min(24.25rem,calc(100vw-2.375rem))] max-w-none -translate-1/2 overflow-hidden rounded-action bg-background px-5 pt-8 pb-5 text-md leading-plain text-foreground motion-safe:animate-none">
        <section tabIndex={0} aria-label="Content question review" className="min-h-0 min-w-0 overflow-auto overscroll-contain wrap-anywhere">
          <DialogTitle className="mb-3 text-review-title leading-plain">Ask Alpha</DialogTitle>
          <p role="note" aria-label="Selected source" className="my-4">{source}</p>
          <label className="block">
            Question
            <Textarea ref={fieldRef} aria-label="Question about content" className={`${field} h-18`} rows={2} maxLength={2000} value={question} onChange={(event) => onQuestion(event.currentTarget.value)} />
          </label>
          <label className="block">
            Content excerpt
            <Textarea aria-label="Content excerpt" placeholder="Text to discuss" className={`${field} h-[7.5625rem]`} rows={5} maxLength={12000} value={excerpt} onChange={(event) => onExcerpt(event.currentTarget.value)} />
          </label>
          <label className="my-3 flex min-h-11 items-center gap-2">
            <input type="checkbox" defaultChecked className="m-1 size-6 shrink-0 accent-auto [color-scheme:light]" /> Link source
          </label>
          <p role="status">{status}</p>
        </section>
        <footer className="flex shrink-0 flex-row-reverse flex-wrap gap-2">
          <Button className={action} disabled={!ready} onClick={onConfirm}>Add to chat</Button>
          <Button className={action} onClick={onCancel}>Cancel</Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
