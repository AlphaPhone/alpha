/* eslint-disable @eslint-react/no-array-index-key -- A reply's blocks and runs are read from its text in order and never move. */
import { type ComponentProps, Fragment, type KeyboardEvent, type MouseEvent, type ReactNode, useId, useState } from "react";
import { AudioLines, Copy, CornerUpLeft, GitBranch, Mail, Pencil } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Mark } from "../Mark.tsx";
import { AssistantAttachmentChip, type AssistantAttachment } from "./AssistantAttachmentChip.tsx";
import { replyMarkdown, type ReplyBlock, type ReplyInline } from "./replyMarkdown.ts";

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
  /** Opens an https link in Alpha's message. */
  onOpenLink?: (href: string) => void;
  /** Alpha is still writing it: a mark its last line has not closed is held back. */
  streaming?: boolean;
};

const actionItem = cn(focusRing, "flex min-h-11 shrink-0 items-center gap-2 rounded-option px-3.5 text-sm font-semibold whitespace-nowrap focus-visible:-outline-offset-2 active:bg-accent pointer-fine:hover:bg-accent [&_svg]:size-4 [&_svg]:shrink-0");

/** Alpha's words with the model's Markdown marks drawn; an https link opens through `onOpenLink`. */
function ReplyRuns({ runs, onOpenLink }: { runs: readonly ReplyInline[]; onOpenLink?: ((href: string) => void) | undefined }): ReactNode {
  return runs.map((run, index) => {
    switch (run.kind) {
      case "text": return <Fragment key={index}>{run.text}</Fragment>;
      case "strong": return <strong key={index} className="font-semibold"><ReplyRuns runs={run.children} onOpenLink={onOpenLink} /></strong>;
      case "emphasis": return <em key={index}><ReplyRuns runs={run.children} onOpenLink={onOpenLink} /></em>;
      case "code": return <code key={index} className="rounded-sm bg-secondary px-1 font-mono text-sm">{run.text}</code>;
      case "link": return (
        <a key={index} className="pointer-events-auto underline underline-offset-2" href={run.href} target="_blank" rel="noopener noreferrer" onClick={(event) => {
          if (!onOpenLink) return;
          event.preventDefault();
          onOpenLink(run.href);
        }}><ReplyRuns runs={run.children} onOpenLink={onOpenLink} /></a>
      );
    }
  });
}

function ReplyBlocks({ blocks, onOpenLink }: { blocks: readonly ReplyBlock[]; onOpenLink?: ((href: string) => void) | undefined }): ReactNode {
  return blocks.map((block, index) => {
    switch (block.kind) {
      case "paragraph": return <p key={index}>{block.lines.map((line, at) => <Fragment key={at}>{at > 0 ? <br /> : null}<ReplyRuns runs={line} onOpenLink={onOpenLink} /></Fragment>)}</p>;
      case "heading": return <p key={index} className="font-semibold"><ReplyRuns runs={block.words} onOpenLink={onOpenLink} /></p>;
      case "quote": return <blockquote key={index} className="flex flex-col gap-2 border-l-2 border-border pl-3 text-muted-foreground"><ReplyBlocks blocks={block.blocks} onOpenLink={onOpenLink} /></blockquote>;
      case "code": return <pre key={index} className="rounded-md bg-secondary p-3 font-mono text-sm whitespace-pre-wrap wrap-anywhere">{block.text}</pre>;
      case "rule": return <hr key={index} className="border-border" />;
      case "list": {
        const items = block.items.map((item, at) => <li key={at} className="space-y-1 pl-0.5"><ReplyBlocks blocks={item} onOpenLink={onOpenLink} /></li>);
        return block.start === undefined
          ? <ul key={index} className="flex list-disc flex-col gap-1 pl-5">{items}</ul>
          : <ol key={index} start={block.start} className="flex list-decimal flex-col gap-1 pl-5">{items}</ol>;
      }
    }
  });
}

/** Gives focus back to the message whose row of actions `from` is in. */
function refocus(from: HTMLElement) {
  from.closest("article")?.querySelector<HTMLButtonElement>("button[aria-haspopup=menu]")?.focus();
}

/** Moves between the actions of the row with the arrow keys, Home and End, as a menu does; Escape closes it. */
function roam(event: KeyboardEvent<HTMLDivElement>, close: () => void) {
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>("[role=menuitem]")];
  const at = items.indexOf(event.target as HTMLElement);
  const to = { ArrowRight: at + 1, ArrowDown: at + 1, ArrowLeft: at - 1, ArrowUp: at - 1, Home: 0, End: items.length - 1 }[event.key];
  if (event.key === "Escape") {
    event.preventDefault();
    refocus(event.currentTarget);
    close();
  } else if (to !== undefined && items.length) {
    event.preventDefault();
    items[(to + items.length) % items.length]?.focus();
  }
}

/**
 * One message of the conversation: the owner's in a quiet bubble at the end, Alpha's as plain text under its mark
 * with the cards of its reply. Pressing the text opens a row of what can be done with it under the message, each
 * action only where it is offered; a link in the text is its own control beside that press, never inside it. Alpha's words are drawn with the model's Markdown (spec/app/assistant/reply.md).
 * @model spec/app/assistant/chats.md
 */
export function AssistantMessage({ author, text, quote, attachments = [], children, onPreview, onQuote, onCopy, onUseInEmail, onEditAgain, onFork, onReadAloud, onOpenLink, streaming = false, className, ...props }: AssistantMessageProps) {
  const owner = author === "owner";
  const body = <span className="break-words whitespace-pre-line">{text}</span>;
  const shown = owner ? body : <span className="flex flex-col gap-3 break-words"><ReplyBlocks blocks={replyMarkdown(text, streaming)} onOpenLink={onOpenLink} /></span>;
  const bubble = cn("max-w-full text-left text-base", owner ? "rounded-tile rounded-br-box bg-alpha px-4 py-2.75 leading-normal text-alpha-foreground" : "text-body leading-chat");
  const actions = onQuote || onCopy || onUseInEmail || onEditAgain || onFork || onReadAloud;
  const [open, setOpen] = useState<false | "pointer" | "keys">(false);
  const rowId = useId();
  const close = () => setOpen(false);
  const pick = (event: MouseEvent<HTMLButtonElement>, act: () => void) => {
    refocus(event.currentTarget);
    close();
    act();
  };
  return (
    <article aria-label={owner ? "You" : "Alpha"} onBlur={(event) => { if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) close(); }} className={cn("flex flex-col gap-2", owner ? "ml-auto max-w-4/5 items-end" : "items-start", className)} {...props}>
      {attachments.length ? (
        <div className={cn("flex flex-wrap gap-2", owner && "justify-end")}>
          {attachments.map((attachment) => <AssistantAttachmentChip key={attachment.id} attachment={attachment} onPreview={onPreview && (() => onPreview(attachment.id))} />)}
        </div>
      ) : null}
      {quote ? <p className="line-clamp-2 border-l-2 border-border pl-3 text-sm break-words text-muted-foreground">{quote}</p> : null}
      <div className="flex max-w-full items-start gap-2.5">
        {owner ? null : <span aria-hidden className="mt-0.75 flex size-4.5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-alpha text-alpha-foreground"><Mark className="size-[118%] shrink-0" /></span>}
        {actions ? (
          <div className="relative max-w-full">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={Boolean(open)}
              aria-controls={open ? rowId : undefined}
              aria-label="Message actions"
              className={cn(focusRing, "absolute inset-0 min-h-11", owner && "rounded-tile rounded-br-box")}
              onClick={() => setOpen((was) => (was ? false : "pointer"))}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " " && event.key !== "ArrowDown") return;
                event.preventDefault();
                setOpen("keys");
              }}
            />
            <div className={cn(bubble, "pointer-events-none relative")}>{shown}</div>
          </div>
        ) : (
          <div className={bubble}>{shown}</div>
        )}
      </div>
      {actions && open ? (
        <div id={rowId} role="menu" aria-label="Message actions" aria-orientation="horizontal" className={cn("flex max-w-full overflow-x-auto rounded-md bg-secondary p-1", owner ? "self-end" : "self-start")} onKeyDown={(event) => roam(event, close)}>
          {[
            onQuote && { key: "reply", act: onQuote, icon: <CornerUpLeft aria-hidden />, text: "Reply" },
            onCopy && { key: "copy", act: onCopy, icon: <Copy aria-hidden />, text: "Copy", className: "w-25" },
            onUseInEmail && { key: "email", act: onUseInEmail, icon: <Mail aria-hidden />, text: "Email", label: "Use in email" },
            onReadAloud && { key: "read", act: onReadAloud, icon: <AudioLines aria-hidden />, text: "Read aloud", className: "text-primary" },
            onEditAgain && { key: "edit", act: onEditAgain, icon: <Pencil aria-hidden />, text: "Edit", label: "Edit and resend" },
            onFork && { key: "fork", act: onFork, icon: <GitBranch aria-hidden />, text: "New chat from here" },
          ].filter((item) => item !== undefined).map((item, index) => (
            <button key={item.key} type="button" role="menuitem" autoFocus={open === "keys" && index === 0} aria-label={item.label} className={cn(actionItem, item.className)} onClick={(event) => pick(event, item.act)}>{item.icon}{item.text}</button>
          ))}
        </div>
      ) : null}
      {children ? <div className="flex w-full flex-col gap-3">{children}</div> : null}
    </article>
  );
}
