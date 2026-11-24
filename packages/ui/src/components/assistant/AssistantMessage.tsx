import type { ComponentProps, ReactNode } from "react";
import { CornerUpLeft, GitBranch, Pencil, Volume2 } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { AssistantMark } from "./AssistantMark.tsx";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../Menu.tsx";
import { AssistantAttachmentChip, type AssistantAttachment } from "./AssistantAttachmentChip.tsx";

export type AssistantMessageProps = Omit<ComponentProps<"article">, "children"> & {
  /** Who wrote it: the owner, or Alpha. */
  author: "owner" | "alpha";
  /** What it says. */
  text: string;
  /** The message this one quotes. */
  quote?: string;
  /** What went with the owner's message. */
  attachments?: AssistantAttachment[];
  /** The cards of Alpha's reply. */
  children?: ReactNode;
  /** Opens an image sent with the message, over the conversation. */
  onPreview?: (id: string) => void;
  /** Quotes the message in the next one. */
  onQuote?: () => void;
  /** Puts the owner's message back in an empty composer to edit and send as a new one. */
  onEditAgain?: () => void;
  /** Takes another conversation from here, with the way back. */
  onFork?: () => void;
  /** Has Alpha's message read aloud; the voice area reads it. */
  onReadAloud?: () => void;
};

/**
 * One message of the conversation: the owner's in a blue bubble at the end, Alpha's as plain text beside its mark
 * with the cards of its reply. Pressing the text opens what can be done with it, each action only where it is offered.
 * @model spec/app/assistant/chats.md
 */
export function AssistantMessage({ author, text, quote, attachments = [], children, onPreview, onQuote, onEditAgain, onFork, onReadAloud, className, ...props }: AssistantMessageProps) {
  const owner = author === "owner";
  const body = <span className="wrap-anywhere whitespace-pre-line">{text}</span>;
  const bubble = cn("min-w-0 text-left", owner ? "max-w-[80%] rounded-tile rounded-br-bubble-tail bg-alpha px-4 py-2.75 text-base text-alpha-foreground" : "flex-1 text-chat");
  const actions = onQuote || onEditAgain || onFork || onReadAloud;
  return (
    <article aria-label={owner ? "You" : "Alpha"} className={cn("flex flex-col gap-3", owner ? "items-end" : "items-start", className)} {...props}>
      {attachments.length ? (
        <div className={cn("flex flex-wrap gap-2", owner && "justify-end")}>
          {attachments.map((attachment) => <AssistantAttachmentChip key={attachment.id} attachment={attachment} onPreview={onPreview && (() => onPreview(attachment.id))} />)}
        </div>
      ) : null}
      {quote ? <p className="line-clamp-2 border-l-2 border-border pl-3 text-sm break-words text-muted-foreground">{quote}</p> : null}
      <div className={cn("flex w-full items-start", owner ? "justify-end" : "gap-2.5")}>
        {owner ? null : <AssistantMark className="mt-0.75 size-4.5" />}
        {actions ? (
          <Menu>
            <MenuTrigger asChild>
              <button type="button" className={cn(focusRing, bubble, owner || "min-h-11")}>{body}</button>
            </MenuTrigger>
            <MenuContent align={owner ? "end" : "start"}>
              {onQuote ? <MenuItem onSelect={onQuote}><CornerUpLeft aria-hidden />Reply</MenuItem> : null}
              {onEditAgain ? <MenuItem onSelect={onEditAgain}><Pencil aria-hidden />Edit and resend</MenuItem> : null}
              {onFork ? <MenuItem onSelect={onFork}><GitBranch aria-hidden />New chat from here</MenuItem> : null}
              {onReadAloud ? <MenuItem onSelect={onReadAloud}><Volume2 aria-hidden />Read aloud</MenuItem> : null}
            </MenuContent>
          </Menu>
        ) : (
          <p className={bubble}>{body}</p>
        )}
      </div>
      {children ? <div className="flex w-full flex-col gap-3">{children}</div> : null}
    </article>
  );
}
