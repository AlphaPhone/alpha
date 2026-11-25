import type { ComponentProps, ReactNode } from "react";
import { Copy, CornerUpLeft, GitBranch, Mail, Pencil, Volume2 } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Mark } from "../Mark.tsx";
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
  /** Copies the message's text. */
  onCopy?: () => void;
  /** Opens an Inbox review for using Alpha's answer in an email draft. */
  onUseInEmail?: () => void;
  /** Puts the owner's message back in an empty composer to edit and send as a new one. */
  onEditAgain?: () => void;
  /** Takes another conversation from here, with the way back. */
  onFork?: () => void;
  /** Has Alpha's message read aloud; the voice area reads it. */
  onReadAloud?: () => void;
};

/**
 * One message of the conversation: the owner's in a quiet bubble at the end, Alpha's as plain text under its mark
 * with the cards of its reply. Pressing the text opens what can be done with it, each action only where it is offered.
 * @model spec/app/assistant/chats.md
 */
export function AssistantMessage({ author, text, quote, attachments = [], children, onPreview, onQuote, onCopy, onUseInEmail, onEditAgain, onFork, onReadAloud, className, ...props }: AssistantMessageProps) {
  const owner = author === "owner";
  const body = <span className="break-words whitespace-pre-line">{text}</span>;
  const bubble = cn("max-w-full text-left text-base", owner ? "rounded-tile rounded-br-box bg-alpha px-4 py-2.75 leading-normal text-alpha-foreground" : "text-body leading-chat");
  const actions = onQuote || onCopy || onUseInEmail || onEditAgain || onFork || onReadAloud;
  return (
    <article aria-label={owner ? "You" : "Alpha"} className={cn("flex flex-col gap-2", owner ? "ml-auto max-w-4/5 items-end" : "items-start", className)} {...props}>
      {attachments.length ? (
        <div className={cn("flex flex-wrap gap-2", owner && "justify-end")}>
          {attachments.map((attachment) => <AssistantAttachmentChip key={attachment.id} attachment={attachment} onPreview={onPreview && (() => onPreview(attachment.id))} />)}
        </div>
      ) : null}
      {quote ? <p className="line-clamp-2 border-l-2 border-border pl-3 text-sm break-words text-muted-foreground">{quote}</p> : null}
      <div className="flex max-w-full items-start gap-2.5">
        {owner ? null : <span aria-hidden className="mt-0.75 flex size-4.5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-alpha text-alpha-foreground"><Mark className="size-[118%] shrink-0" /></span>}
        {actions ? (
          <Menu>
            <MenuTrigger asChild>
              <button type="button" className={cn(focusRing, bubble, "relative before:absolute before:inset-0 before:min-h-11")}>{body}</button>
            </MenuTrigger>
            <MenuContent align={owner ? "end" : "start"}>
              {onQuote ? <MenuItem onSelect={onQuote}><CornerUpLeft aria-hidden />Reply</MenuItem> : null}
              {onCopy ? <MenuItem onSelect={onCopy}><Copy aria-hidden />Copy</MenuItem> : null}
              {onUseInEmail ? <MenuItem onSelect={onUseInEmail}><Mail aria-hidden />Use in email</MenuItem> : null}
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
