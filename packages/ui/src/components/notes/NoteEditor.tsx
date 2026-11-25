import type { ComponentProps, ReactNode } from "react";
import { Check, ChevronLeft, ListChecks, Plus, X } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

/** One item of a checklist as the editor shows it. */
export interface NoteEditorItem {
  /** Names the item while its words change. */
  key: string;
  /** What the item says. */
  text: string;
  /** Whether it is ticked. */
  done: boolean;
}

export type NoteEditorProps = Omit<ComponentProps<"section">, "title"> & {
  /** The note's title, typed in the editor. */
  title: string;
  /** A text note's words, or a checklist's items. */
  kind: "text" | "list";
  /** A text note's words. */
  body?: string;
  /** A checklist's items. */
  items?: NoteEditorItem[];
  /** What is being typed as the next item of a checklist. */
  next?: string;
  /** Says what became of the last save, when the owner should know. */
  status?: string;
  /** Receipts and choices for a draft that is waiting on the owner. */
  feedback?: ReactNode;
  /** Takes nothing typed while the note is on its way to Recently deleted. */
  locked?: boolean;
  /** The note's actions: a `NoteMenu`. */
  menu?: ReactNode;
  onTitle?: (title: string) => void;
  onBody?: (body: string) => void;
  onItem?: (index: number, item: NoteEditorItem) => void;
  onRemoveItem?: (index: number) => void;
  onNext?: (text: string) => void;
  /** Adds what is typed as the next item. */
  onAddItem?: () => void;
  /** Turns a text note into a checklist, or back. */
  onFormat?: () => void;
  /** Leaves the note for the list. */
  onBack?: () => void;
  /** Ends writing and leaves the note for the list. */
  onDone?: () => void;
};

const iconButton = cn(focusRing, "flex size-11 shrink-0 items-center justify-center rounded-full active:bg-accent");
const box = (done: boolean) => cn("flex size-5.5 items-center justify-center rounded-box", done ? "bg-foreground text-background" : "text-transparent inset-ring-[1.5px] inset-ring-muted-foreground");

/** Writing a text note or a checklist: its title, then its words or its items, under Back, the format, its actions and Done. */
export function NoteEditor({ title, kind, body = "", items = [], next = "", status, feedback, locked = false, menu, onTitle, onBody, onItem, onRemoveItem, onNext, onAddItem, onFormat, onBack, onDone, className, ...props }: NoteEditorProps) {
  return (
    <section aria-label={title || "New note"} className={cn("absolute inset-0 z-10 flex flex-col bg-background", className)} {...props}>
      <div className="flex h-14 shrink-0 items-center gap-0.5 px-2">
        <button type="button" aria-label="Back to notes" onClick={onBack} className={iconButton}><ChevronLeft aria-hidden className="size-5.5" /></button>
        <div className="grow" />
        {onFormat && (
          <button type="button" aria-label={kind === "list" ? "Turn into text" : "Turn into checklist"} onClick={onFormat} className={cn(iconButton, kind === "list" && "text-primary")}>
            <ListChecks aria-hidden className="size-5.5" />
          </button>
        )}
        {menu}
        <button type="button" onClick={onDone} className={cn(focusRing, "min-h-11 rounded-full px-3 font-semibold text-foreground active:bg-accent")}>Done</button>
      </div>
      {status && <div role="status" aria-live="polite" className="px-6 pb-1 text-xs text-muted-foreground">{status}</div>}
      {feedback == null ? null : <div className="mx-auto w-full max-w-3xl shrink-0 px-6">{feedback}</div>}
      <div className="mx-auto w-full max-w-3xl shrink-0 px-6 pt-1">
        <input
          aria-label="Title"
          placeholder="Title"
          value={title}
          readOnly={locked}
          onChange={(event) => onTitle?.(event.currentTarget.value)}
          className="w-full border-0 bg-transparent py-1.5 font-display text-3xl font-light text-foreground outline-none"
        />
      </div>
      {kind === "text" ? (
        <textarea
          aria-label="Note"
          placeholder="Note"
          value={body}
          readOnly={locked}
          onChange={(event) => onBody?.(event.currentTarget.value)}
          className="mx-6 min-h-0 grow touch-pan-y resize-none border-0 bg-transparent pt-2.5 pb-4 text-lg leading-relaxed text-foreground outline-none"
        />
      ) : (
        <div className="mx-auto min-h-0 w-full max-w-3xl grow touch-pan-y overflow-y-auto px-3 pt-2 pb-47.5">
          {items.map((item, index) => (
            <div key={item.key} className="flex min-h-12 items-center gap-0.5">
              <button type="button" aria-label={`${item.done ? "Uncheck" : "Check"} ${item.text}`} disabled={locked} onClick={() => onItem?.(index, { ...item, done: !item.done })} className={cn(focusRing, "flex size-12 shrink-0 items-center justify-center rounded-full")}>
                <span className={box(item.done)}><Check aria-hidden className="size-3.75" /></span>
              </button>
              <input aria-label="Item" value={item.text} readOnly={locked} onChange={(event) => onItem?.(index, { ...item, text: event.currentTarget.value })} className={cn("h-11 min-w-0 grow border-0 bg-transparent text-lg text-foreground outline-none", item.done && "text-muted-foreground line-through")} />
              <button type="button" aria-label={`Remove ${item.text}`} disabled={locked} onClick={() => onRemoveItem?.(index)} className={cn(focusRing, "flex size-12 shrink-0 items-center justify-center rounded-full text-muted-foreground")}>
                <X aria-hidden className="size-4.5" />
              </button>
            </div>
          ))}
          <div className="flex min-h-12 items-center gap-0.5">
            <button type="button" aria-label="Add item" disabled={locked} onClick={onAddItem} className={cn(focusRing, "flex size-12 shrink-0 items-center justify-center rounded-full text-muted-foreground")}>
              <Plus aria-hidden className="size-5" />
            </button>
            <input
              aria-label="New item"
              placeholder="Add item"
              value={next}
              readOnly={locked}
              onChange={(event) => onNext?.(event.currentTarget.value)}
              onKeyDown={(event) => { if (event.key === "Enter") onAddItem?.(); }}
              className="h-11 min-w-0 grow border-0 bg-transparent text-lg text-foreground outline-none"
            />
          </div>
        </div>
      )}
    </section>
  );
}
