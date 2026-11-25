import type { ComponentProps, PointerEvent, ReactNode, Ref } from "react";
import { ArrowUp, Clock, Mic, Paperclip, Plus, Search } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { Mark } from "../Mark.tsx";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../Menu.tsx";
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
  /** Opens the picker for photos and documents, from the chat actions; offered while the composer has room. */
  onAttach?: () => void;
  /** Opens search across every conversation, from the chat actions. */
  onSearch?: () => void;
  /** Starts a new conversation, from the chat actions; offered only while the turn and the composer are free. */
  onNew?: () => void;
  /** A new conversation is being made. */
  making?: boolean;
  /** Opens the list of conversations, from the chat actions. */
  onHistory?: () => void;
  /** Starts a spoken turn; the voice area owns it. */
  onTalk?: () => void;
  /** Records a transcript the owner can edit before it enters the draft; its mic stands where Talk does, only where Talk is not offered. */
  onDictate?: () => void;
  /** Takes the field's place while a voice conversation owns the composer. */
  voice?: ReactNode;
  /** What the voice area tells the owner when Talk could not continue. */
  voiceNotice?: ReactNode;
  /** Opens the conversation from the bar. */
  onOpen?: () => void;
  /** The other target when Ask Alpha is open above a call or a conversation. */
  leading?: ReactNode;
  /** The mark in the closed dock when it also acts as the gesture handle. */
  opener?: ReactNode;
  /** The target or action named in the field. */
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

function keepComposerFocus(event: PointerEvent<HTMLButtonElement>) {
  event.stopPropagation();
  if (event.button === 0 && event.currentTarget.ownerDocument.activeElement?.matches("textarea[data-alpha-composer]")) event.preventDefault();
}

/**
 * The composer: the draft's field with what waits to go with it, the chat actions behind + before it, and Send, Stop
 * reply or Talk at its end. On the bar it is the floating pill, in the sheet the field at its foot. It keeps no rule;
 * each control is shown as its handler is given.
 * @model spec/app/assistant/composer.md
 */
export function AssistantComposer({
  variant = "sheet", value, onValueChange, closed = false, notice, unavailable, attachments = [], limit = 4, quote, editing = false, lift,
  onSend, onStop, stopping = false, onAttach, onSearch, onNew, making = false, onHistory, onTalk, onDictate, voice, voiceNotice, onOpen, leading, opener, placeholder, onFocusField, fieldRef, onRemoveAttachment, onPreviewAttachment, onUnquote, className, style, ...props
}: AssistantComposerProps) {
  const written = value.trim() !== "" || attachments.length > 0;
  const bar = variant === "bar";
  const targeting = !bar && placeholder !== undefined;
  const acting = Boolean(onAttach || onSearch || onNew || making || onHistory) && !closed;
  return (
    <div data-host-chrome={bar ? "" : undefined} className={cn("flex shrink-0 flex-col gap-2", bar ? "mx-4 mb-[max(1.75rem,calc(max(var(--alpha-native-inset-bottom,0px),env(safe-area-inset-bottom))_+_0.75rem))]" : "mx-3 mb-[max(1.875rem,calc(max(var(--alpha-native-inset-bottom,0px),env(safe-area-inset-bottom))_+_0.75rem))]", className)} style={lift ? { marginBottom: lift, ...style } : style} {...props}>
      {notice ? <AssistantDraftNotice {...notice} /> : null}
      {unavailable ? <span role="status" className="sr-only">{reasons[unavailable]}</span> : null}
      {attachments.length ? <AssistantPendingAttachments attachments={attachments} limit={limit} onRemove={onRemoveAttachment} onPreview={onPreviewAttachment} /> : null}
      {quote ? <AssistantQuoteBar kind="quote" text={quote} onRemove={onUnquote} /> : null}
      {editing ? <AssistantQuoteBar kind="editing" /> : null}
      {voiceNotice}
      {voice}
      <div hidden={Boolean(voice)} className={cn("touch-pan-y items-center bg-secondary", voice ? "hidden" : "flex", bar ? "min-h-18.5 gap-1 rounded-dock py-1.5 pr-2 pl-2.25 shadow-dock dark:shadow-dock-dark" : "min-h-17 gap-1.5 rounded-sheet py-1.5 pr-1.5 pl-5")}>
        {leading}
        {bar ? opener ?? (onOpen ? (
          <Button size="icon" aria-label="Open conversation" className="overflow-hidden bg-alpha text-alpha-foreground hover:bg-alpha/90" onClick={onOpen}><Mark aria-hidden className="size-[118%]" /></Button>
        ) : null) : null}
        {targeting ? (onAttach ? <Button variant="ghost" size="icon" aria-label="Attach" disabled={closed} onClick={onAttach}><Plus /></Button> : null) : (
          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Chat actions" disabled={!acting} className="hover:bg-transparent disabled:opacity-40"><Plus /></Button>
            </MenuTrigger>
            <MenuContent side="top" align="start" sideOffset={12} className="min-w-55 rounded-tile border-0 bg-background p-2 shadow-dock dark:shadow-dock-dark">
              {onAttach ? <MenuItem onSelect={onAttach}><Paperclip aria-hidden />Attach media</MenuItem> : null}
              {onSearch ? <MenuItem onSelect={onSearch}><Search aria-hidden />Search chat</MenuItem> : null}
              {onNew || making ? <MenuItem disabled={making} onSelect={onNew}><Plus aria-hidden />New chat</MenuItem> : null}
              {onHistory ? <MenuItem onSelect={onHistory}><Clock aria-hidden />Chat history</MenuItem> : null}
            </MenuContent>
          </Menu>
        )}
        <Textarea
          ref={fieldRef}
          data-alpha-composer=""
          aria-label={targeting ? placeholder : "Message Alpha"}
          placeholder={placeholder ?? (bar ? "Ask Alpha" : "Message Alpha")}
          rows={1}
          value={value}
          disabled={closed}
          onChange={(event) => onValueChange(event.target.value)}
          onFocus={onFocusField}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
            event.preventDefault();
            if (!event.repeat && !closed && !onStop && !stopping) onSend?.();
          }}
          className={cn("max-h-[min(10.5rem,28dvh)] min-h-11 min-w-0 flex-1 touch-auto rounded-full bg-transparent py-2.75 text-body leading-field", targeting ? "border border-alpha px-3" : cn("border-0 pr-0.5 focus-visible:outline-none", bar ? "pl-2" : "pl-0.5"))}
        />
        {onStop || stopping ? (
          <Button size="icon" aria-label="Stop reply" loading={stopping} className="bg-foreground text-background hover:bg-foreground/90" onClick={onStop}><svg aria-hidden viewBox="0 0 24 24" className="size-5.5"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" /></svg></Button>
        ) : written ? (
          <Button
            size="icon"
            aria-label="Send"
            className="bg-alpha text-alpha-foreground hover:bg-alpha/90"
            disabled={closed || !onSend}
            onPointerDown={keepComposerFocus}
            onClick={onSend}
          ><ArrowUp /></Button>
        ) : onTalk ? (
          <Button variant="ghost" size="icon" aria-label="Talk" className={bar ? undefined : "bg-foreground text-background hover:bg-foreground/90"} onPointerDown={keepComposerFocus} onClick={onTalk}><Mic /></Button>
        ) : onDictate ? (
          <Button variant="ghost" size="icon" aria-label="Dictate" onPointerDown={keepComposerFocus} onClick={onDictate}><Mic /></Button>
        ) : null}
      </div>
    </div>
  );
}
