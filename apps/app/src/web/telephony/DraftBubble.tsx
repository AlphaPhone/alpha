// spec/telephony/drafts.md, "Alpha's draft goes only into an unoccupied slot addressed to exactly the same people, and keeps one Undo"; spec/telephony/drafts.md, "Edit makes Alpha's draft the owner's text, and Don't send restores what it replaced"
import { Undo2 } from "lucide-react";
import type { Slot } from "../../../gen/telephony__drafts.ts";
import { Button, Textarea } from "../components/ui/index.ts";
import { cn } from "../lib/cn.ts";
import { displayNumber } from "./present.ts";

export interface DraftBubbleProps {
  /** The conversation's draft slot. */
  slot: Slot;
  /** Who the draft goes to, as the conversation names them. */
  title: string;
  /** Send is offered (a recipient, text or a picture, nothing sending). */
  canSend: boolean;
  /** The owner's Send tap: the same journal as the bar. */
  onSend: () => void;
  /** Edit: the chat closes and the draft is the owner's text in the bar. */
  onEdit: () => void;
  /** The owner rewrote Alpha's draft in its bubble. */
  onText: (text: string) => void;
  /** Don't send: Alpha's draft goes and what it replaced comes back. */
  onDiscard: () => void;
  /** Undo: the text Alpha's draft replaced comes back. */
  onUndo: () => void;
}

/**
 * A draft waiting in the stage while the chat is open: Alpha's draft dashed and "not sent", or the owner's own; shown whole, never cut off, with Edit and Send pinned below.
 * @model spec/telephony/drafts.md
 * @design design.md
 */
export function DraftBubble({ slot, title, canSend, onSend, onEdit, onText, onDiscard, onUndo }: DraftBubbleProps) {
  const alpha = slot.author === "ByAlpha";
  const to = slot.recipients.map(displayNumber).join(", ");
  const label = alpha ? `Alpha's draft, not sent, to ${title && title !== to ? `${title} · ${to}` : to}` : "Your draft, not sent";
  const busy = slot.outcome === "Sending";
  return (
    <section aria-label={label} className={cn("flex w-full flex-col gap-2 rounded-xl border border-dashed p-3", alpha ? "border-primary" : "border-border bg-secondary")}>
      <span className="font-mono text-xs uppercase text-muted-foreground">{alpha ? "Alpha's draft · not sent" : "Your draft"}</span>
      {alpha ? (
        <Textarea aria-label="Draft text" value={slot.text} disabled={busy} onChange={(event) => onText(event.target.value)} className="min-h-20 resize-none" />
      ) : (
        <p className="whitespace-pre-wrap break-words">{slot.text}</p>
      )}
      <div className="sticky bottom-0 flex items-center gap-2">
        {slot.undo.tag === "UndoTo" && !busy && <Button variant="ghost" size="icon" aria-label="Undo" onClick={onUndo}><Undo2 aria-hidden /></Button>}
        <span className="flex-1" />
        {alpha && <Button variant="ghost" disabled={busy} onClick={onDiscard}>Don’t send</Button>}
        <Button variant="secondary" disabled={busy} onClick={onEdit}>Edit</Button>
        <Button disabled={!canSend} loading={busy} onClick={onSend}>Send</Button>
      </div>
    </section>
  );
}
