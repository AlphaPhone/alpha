import type { ComponentProps, ReactNode, Ref } from "react";
import { ArrowUp, Mic, Plus, Square } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { Mark } from "../Mark.tsx";
import { Textarea } from "../Textarea.tsx";
import { AssistantDraftNotice, type AssistantDraftNoticeProps } from "./AssistantDraftNotice.tsx";
import type { AssistantAttachment } from "./AssistantAttachmentChip.tsx";
import { AssistantPendingAttachments } from "./AssistantPendingAttachments.tsx";
import { AssistantQuoteBar } from "./AssistantQuoteBar.tsx";

export type AssistantComposerProps = Omit<ComponentProps<"div">, "children" | "onChange"> & {
  /** Where the composer sits: in the Ask Alpha bar, raised on its own, or at the foot of the conversation sheet. */
  variant?: "bar" | "sheet";
  /** The text being written. */
  value: string;
  /** Called with the text as it is typed. */
  onValueChange: (value: string) => void;
  /** The draft's slot is not open yet, or could not be: the field takes no typing. */
  closed?: boolean;
  /** Something to tell or ask about the saved draft, above the field. */
  notice?: AssistantDraftNoticeProps;
  /** Why nothing can be sent now: Alpha cannot be reached, or the screen is sensitive and is never sent. Said to a screen reader only; no text is written by the composer. */
  unavailable?: "away" | "sensitive";
  /** What waits to go with the message. */
  attachments?: AssistantAttachment[];
  /** How many files the upload allows. */
  limit?: number;
  /** The message the next send quotes. */
  quote?: string;
  /** The message being written is an earlier one edited to send again. */
  editing?: boolean;
  /** Raises the composer above the keyboard and the navigation bar by this many pixels while typing. */
  lift?: number;
  /** Sends what is written; offered only when the message can be asked of the conversation. */
  onSend?: () => void;
  /** Stops the reply in flight, or takes back a message nothing was heard of. */
  onStop?: () => void;
  /** Stop was asked and the bridge has not yet said whether the message had left. */
  stopping?: boolean;
  /** Opens the picker for photos and documents; offered while the composer has room. */
  onAttach?: () => void;
  /** Starts a spoken turn; the voice area owns it. */
  onTalk?: () => void;
  /** Opens the conversation from the bar. */
  onOpen?: () => void;
  /** The mark in the closed dock when it also acts as the gesture handle. */
  opener?: ReactNode;
  /** The action suggested by the screen under the closed dock. */
  placeholder?: string;
  /** Called when the field takes focus: on the bar this opens Ask Alpha as a sheet. */
  onFocusField?: () => void;
  /** Ref to the composer field so a tap on the resting bar can focus it synchronously. */
  fieldRef?: Ref<HTMLTextAreaElement>;
  /** Removes a pending attachment. */
  onRemoveAttachment?: (id: string) => void;
  /** Opens a pending image over the conversation. */
  onPreviewAttachment?: (id: string) => void;
  /** Takes the quote off. */
  onUnquote?: () => void;
};

const reasons = { away: "Alpha cannot be reached", sensitive: "This screen is private and is never sent" };

/**
 * The composer: the draft's field with what waits to go with it, and Send, Stop reply or Talk at its end. It keeps no
 * rule; each control is shown as its handler is given.
 * @model spec/app/assistant/composer.md
 */
export function AssistantComposer({
  variant = "sheet", value, onValueChange, closed = false, notice, unavailable, attachments = [], limit = 4, quote, editing = false, lift,
  onSend, onStop, stopping = false, onAttach, onTalk, onOpen, opener, placeholder, onFocusField, fieldRef, onRemoveAttachment, onPreviewAttachment, onUnquote, className, style, ...props
}: AssistantComposerProps) {
  const written = value.trim() !== "" || attachments.length > 0;
  const bar = variant === "bar";
  return (
    <div data-host-chrome={bar ? "" : undefined} className={cn("flex shrink-0 flex-col gap-2", bar ? "mx-4 mb-[max(1.75rem,calc(env(safe-area-inset-bottom)_+_0.75rem))]" : "mx-3 mb-[max(1.875rem,calc(env(safe-area-inset-bottom)_+_0.75rem))]", className)} style={lift ? { marginBottom: lift, ...style } : style} {...props}>
      {notice ? <AssistantDraftNotice {...notice} /> : null}
      {unavailable ? <span role="status" className="sr-only">{reasons[unavailable]}</span> : null}
      {attachments.length ? <AssistantPendingAttachments attachments={attachments} limit={limit} onRemove={onRemoveAttachment} onPreview={onPreviewAttachment} /> : null}
      {quote ? <AssistantQuoteBar kind="quote" text={quote} onRemove={onUnquote} /> : null}
      {editing ? <AssistantQuoteBar kind="editing" /> : null}
      <div className={cn("flex touch-pan-y items-center bg-secondary", bar ? "min-h-18.5 gap-1 rounded-full py-1.5 pr-2 pl-2.25 shadow-lg" : "min-h-17 gap-1.5 rounded-sheet py-1.5 pr-1.5 pl-5")}>
        {bar ? opener ?? (onOpen ? (
          <Button size="icon" aria-label="Open conversation" className="overflow-hidden bg-alpha text-alpha-foreground hover:bg-alpha/90" onClick={onOpen}><Mark aria-hidden className="size-[118%]" /></Button>
        ) : null) : null}
        <Button variant="ghost" size="icon" aria-label="Attach" disabled={!onAttach || closed} onClick={onAttach}><Plus /></Button>
        <Textarea
          ref={fieldRef}
          data-alpha-composer=""
          aria-label="Message Alpha"
          placeholder={placeholder ?? (bar ? "Ask Alpha" : "Message Alpha")}
          rows={1}
          value={value}
          disabled={closed}
          onChange={(event) => onValueChange(event.target.value)}
          onFocus={onFocusField}
          className="max-h-[min(10.5rem,28dvh)] min-h-11 min-w-0 flex-1 touch-auto rounded-full border-0 bg-transparent px-1 py-2.75"
        />
        {onStop || stopping ? (
          <Button size="icon" aria-label="Stop reply" loading={stopping} className="bg-foreground text-background hover:bg-foreground/90" onClick={onStop}><Square className="size-2.5" fill="currentColor" /></Button>
        ) : written ? (
          <Button size="icon" aria-label="Send" className="bg-alpha text-alpha-foreground hover:bg-alpha/90" disabled={!onSend} onClick={onSend}><ArrowUp /></Button>
        ) : onTalk ? (
          <Button variant="ghost" size="icon" aria-label="Talk" className={bar ? undefined : "bg-foreground text-background hover:bg-foreground/90"} onClick={onTalk}><Mic /></Button>
        ) : null}
      </div>
    </div>
  );
}
