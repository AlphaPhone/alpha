import { type ComponentProps, type Ref, useId } from "react";
import { ArrowUp, CornerUpLeft, MessageSquare, Mic, Pencil, X } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Avatar } from "../Avatar.tsx";
import { Button } from "../Button.tsx";
import { Checkbox } from "../Checkbox.tsx";
import { Label } from "../Label.tsx";
import { Mark } from "../Mark.tsx";
import { Textarea } from "../Textarea.tsx";

/** Active reply or edit context displayed above the message input. */
export type ComposerContext =
  | {
      /** Replying to an earlier message. */
      kind: "reply";
      /** Display name of the message author being replied to. */
      sender: string;
      /** Short excerpt of the message being replied to. */
      excerpt: string;
    }
  | {
      /** Editing an existing message. */
      kind: "edit";
      /** Optional original excerpt shown for reference. */
      excerpt?: string;
    };

/** A draft staged by Ask Alpha for explicit owner review before anything is sent. */
export type StagedAlphaDraft = {
  /** Full draft text staged by Alpha. */
  text: string;
  /** Moves the draft into the composer for editing. */
  onEdit?: () => void;
  /** Sends the staged draft directly; offered only when sending is permitted. */
  onSend?: () => void;
  /** Reverts Alpha's staged draft in one step. */
  onUndo?: () => void;
  /** Disables draft controls and shows progress while sending. */
  sending?: boolean;
};

/** Chat identity displayed on the left target-swap button while Ask Alpha is open. */
export type ComposerTargetAvatar = {
  /** Chat or channel name for avatar initials and accessible label. */
  name: string;
  /** Optional avatar image URL. */
  src?: string;
};

export type ChatComposerProps = Omit<ComponentProps<"div">, "children" | "onChange"> & {
  /** Which surface the unified single bar currently addresses: the active chat or Ask Alpha. */
  target?: "chat" | "alpha";
  /** Chat avatar shown on the left target-swap slot while addressing Ask Alpha. */
  targetAvatar?: ComposerTargetAvatar;
  /** Custom accessible label for the left target-swap control. */
  targetSwapLabel?: string;
  /** Switches the bar between the active chat and Ask Alpha; slot is shown only when provided. */
  onSwapTarget?: () => void;
  /** Current text in the input field. */
  value: string;
  /** Called as the user edits the text. */
  onValueChange: (value: string) => void;
  /** Placeholder shown when the field is empty. */
  placeholder?: string;
  /** Accessible name of the text field; defaults to `placeholder` or the active target name. */
  label?: string;
  /** Active reply or edit context strip above the field. */
  context?: ComposerContext;
  /** Clears the active reply or edit context. */
  onCancelContext?: () => void;
  /** Whether a Slack thread reply should also broadcast to the channel. */
  broadcast?: boolean;
  /** Toggles Slack channel broadcast; checkbox row is shown only when provided. */
  onBroadcastChange?: (checked: boolean) => void;
  /** Label for the broadcast toggle; defaults to `"Also send to channel"`. */
  broadcastLabel?: string;
  /** Staged Ask Alpha draft bubble shown above the composer bar for explicit review. */
  stagedDraft?: StagedAlphaDraft;
  /** Disables typing and controls. */
  disabled?: boolean;
  /** Shows progress on the send control while a message is in flight. */
  sending?: boolean;
  /** Accessible label for the send button; defaults to `"Send"`. */
  sendLabel?: string;
  /** Sends the current message; offered only when sending is allowed. */
  onSend?: () => void;
  /** Starts voice dictation when the field is empty. */
  onTalk?: () => void;
  /** Called when the text field takes focus. */
  onFocusField?: () => void;
  /** Ref forwarded to the underlying `Textarea`. */
  fieldRef?: Ref<HTMLTextAreaElement>;
};

/**
 * Unified single-bar messaging composer with AP-16 target swap (Alpha mark / chat avatar), optional reply or edit
 * context strip, optional Slack channel broadcast toggle, auto-growing `Textarea`, Send or Mic control, and a dashed
 * staged Ask Alpha draft review bubble.
 */
export function ChatComposer({
  target = "chat",
  targetAvatar,
  targetSwapLabel,
  onSwapTarget,
  value,
  onValueChange,
  placeholder,
  label,
  context,
  onCancelContext,
  broadcast = false,
  onBroadcastChange,
  broadcastLabel = "Also send to channel",
  stagedDraft,
  disabled = false,
  sending = false,
  sendLabel = "Send",
  onSend,
  onTalk,
  onFocusField,
  fieldRef,
  className,
  ...props
}: ChatComposerProps) {
  const broadcastId = useId();
  const written = value.trim() !== "";
  const fieldLabel = label ?? placeholder ?? (target === "alpha" ? "Ask Alpha" : "Message");
  const swapLabel = targetSwapLabel ?? (target === "alpha" ? `Back to ${targetAvatar?.name ?? "chat"}` : "Ask Alpha");
  return (
    <div className={cn("flex flex-col gap-2 border-t border-border bg-background px-3 py-2", className)} {...props}>
      {stagedDraft ? (
        <div role="region" aria-label="Alpha draft review" className="flex flex-col gap-2 rounded-tile border border-dashed border-alpha bg-card p-3 text-card-foreground">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-alpha">
            <Mark aria-hidden className="size-4 shrink-0" />
            <span>Alpha&apos;s draft · not sent</span>
          </div>
          <p className="text-base break-words whitespace-pre-line">{stagedDraft.text}</p>
          <div className="flex flex-wrap items-center gap-2">
            {stagedDraft.onSend ? (
              <Button size="sm" loading={stagedDraft.sending} disabled={disabled} onClick={stagedDraft.onSend}>Send</Button>
            ) : null}
            {stagedDraft.onEdit ? (
              <Button variant="secondary" size="sm" disabled={disabled || stagedDraft.sending} onClick={stagedDraft.onEdit}>Edit</Button>
            ) : null}
            {stagedDraft.onUndo ? (
              <Button variant="ghost" size="sm" disabled={disabled || stagedDraft.sending} onClick={stagedDraft.onUndo}>Undo</Button>
            ) : null}
          </div>
        </div>
      ) : null}
      {context ? (
        <div className="flex min-h-11 items-center gap-2 rounded-lg bg-secondary pl-3 text-sm text-secondary-foreground">
          {context.kind === "reply" ? (
            <CornerUpLeft aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <Pencil aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          )}
          <div className="flex min-w-0 flex-1 flex-col py-1">
            <span className="truncate text-xs font-semibold text-foreground">
              {context.kind === "reply" ? `Replying to ${context.sender}` : "Editing message"}
            </span>
            {context.excerpt ? <span className="truncate text-xs text-muted-foreground">{context.excerpt}</span> : null}
          </div>
          {onCancelContext ? (
            <button
              type="button"
              aria-label={context.kind === "reply" ? "Cancel reply" : "Cancel edit"}
              disabled={disabled}
              onClick={onCancelContext}
              className={cn(focusRing, "flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-fast ease-standard hover:bg-accent disabled:pointer-events-none disabled:opacity-50")}
            >
              <X aria-hidden className="size-4" />
            </button>
          ) : null}
        </div>
      ) : null}
      {onBroadcastChange ? (
        <div className="flex items-center gap-1 px-1">
          <Checkbox id={broadcastId} checked={broadcast} disabled={disabled} onCheckedChange={(checked) => onBroadcastChange(checked === true)} />
          <Label htmlFor={broadcastId} className="text-sm font-normal text-muted-foreground">{broadcastLabel}</Label>
        </div>
      ) : null}
      <div className="flex items-end gap-1.5">
        {onSwapTarget ? (
          target === "chat" ? (
            <Button size="icon" aria-label={swapLabel} disabled={disabled} className="bg-alpha text-alpha-foreground hover:bg-alpha/90" onClick={onSwapTarget}>
              <Mark aria-hidden />
            </Button>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={onSwapTarget}
              className={cn(focusRing, "flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-fast ease-standard hover:bg-accent disabled:pointer-events-none disabled:opacity-50")}
            >
              <span className="sr-only">{swapLabel}</span>
              {targetAvatar ? (
                <span aria-hidden className="flex">
                  <Avatar size="sm" name={targetAvatar.name} src={targetAvatar.src} />
                </span>
              ) : (
                <MessageSquare aria-hidden className="size-5 text-foreground" />
              )}
            </button>
          )
        ) : null}
        <Textarea
          ref={fieldRef}
          aria-label={fieldLabel}
          placeholder={placeholder}
          rows={1}
          value={value}
          disabled={disabled}
          onChange={(event) => onValueChange(event.target.value)}
          onFocus={onFocusField}
          className="max-h-40 min-w-0 flex-1 rounded-tile border-0 bg-secondary px-3.5 py-2.5"
        />
        {written || sending ? (
          <Button size="icon" aria-label={sendLabel} loading={sending} disabled={disabled || !onSend} onClick={onSend}>
            <ArrowUp />
          </Button>
        ) : onTalk ? (
          <Button variant="secondary" size="icon" aria-label="Talk" disabled={disabled} onClick={onTalk}>
            <Mic />
          </Button>
        ) : (
          <Button size="icon" aria-label={sendLabel} disabled>
            <ArrowUp />
          </Button>
        )}
      </div>
    </div>
  );
}
