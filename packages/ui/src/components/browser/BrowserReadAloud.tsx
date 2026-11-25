import { useRef } from "react";
import { Button } from "../Button.tsx";
import { Dialog, DialogContent, DialogTitle } from "../Dialog.tsx";
import { Textarea } from "../Textarea.tsx";

export interface BrowserReadAloudProps {
  readonly origin: string;
  readonly excerpt: string;
  readonly pending: boolean;
  readonly reading: boolean;
  readonly blocked: boolean;
  readonly status?: string;
  readonly onExcerpt: (text: string) => void;
  readonly onRead: () => void;
  readonly onStop: () => void;
  readonly onClose: () => void;
}

const action = "h-auto min-h-11 min-w-0 shrink grow basis-[10.625rem] whitespace-normal rounded-[0.625rem] border border-border px-4 py-2 text-md font-normal text-foreground";

/** The public Browser excerpt to edit and hear using local speech. */
export function BrowserReadAloud({ origin, excerpt, pending, reading, blocked, status, onExcerpt, onRead, onStop, onClose }: BrowserReadAloudProps) {
  const focus = useRef<HTMLTextAreaElement>(null);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent onOpenAutoFocus={(event) => { event.preventDefault(); focus.current?.focus(); }}
        onInteractOutside={(event) => event.preventDefault()} aria-describedby={undefined}
        overlayClassName="bg-foreground/10 dark:bg-background/10"
        className="inset-0 m-auto h-fit max-h-[calc(100dvh-2.375rem)] w-[min(27.5rem,calc(100vw-2.375rem))] max-w-none overflow-hidden rounded-action border border-border bg-background px-4 pt-7 pb-4 font-[system-ui] text-md leading-[1.5] text-foreground motion-safe:animate-none">
        <section tabIndex={0} aria-label="Read page excerpt content" className="min-h-0 overflow-auto overscroll-contain wrap-anywhere">
          <DialogTitle className="mb-3 [font-family:system-ui]! text-[1.2em] leading-[1.5] font-bold">Read page excerpt</DialogTitle>
          <p className="my-4">{origin}</p>
          <p className="my-4">On device · not saved</p>
          <label>
            Excerpt to read
            <Textarea ref={focus} aria-label="Excerpt to read" className="h-46.5 w-full field-sizing-fixed resize rounded-[0.5rem] border-border p-2 leading-[1.5] focus:outline-2 focus:-outline-offset-2 focus:outline-solid focus:[outline-color:-webkit-focus-ring-color]"
              rows={7} maxLength={5000} disabled={reading || blocked} value={excerpt} onChange={(event) => onExcerpt(event.currentTarget.value)} />
          </label>
          <p aria-label="Characters" className="text-right text-xs leading-[1.5]">{excerpt.length.toLocaleString()}/5,000</p>
          <p role="status" aria-label="Reading status" className="my-4">{status}</p>
        </section>
        <footer className="flex shrink-0 flex-wrap gap-2">
          <Button variant="secondary" className={action} disabled={pending || reading || blocked} onClick={onRead}>Read locally</Button>
          <Button variant="secondary" className={action} disabled={!reading} onClick={onStop}>Stop reading</Button>
          <Button variant="secondary" className={action} onClick={onClose}>Close</Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
