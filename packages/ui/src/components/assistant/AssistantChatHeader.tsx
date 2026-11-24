import type { ComponentProps, ReactNode } from "react";
import { ChevronDown, Maximize2, MessageSquarePlus, Minimize2, Search } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { Mark } from "../Mark.tsx";
import { AssistantContextChip, type AssistantContextChipProps } from "./AssistantContextChip.tsx";

export type AssistantChatHeaderProps = Omit<ComponentProps<"header">, "title" | "children"> & {
  /** The conversation's name. */
  title: string;
  /** What the agent is told of the screen showing. */
  context?: AssistantContextChipProps;
  /** The handle that resizes the sheet: an `AssistantGrabber`. */
  grabber?: ReactNode;
  /** Opens the list of conversations: the conversation's name is the control. */
  onHistory?: () => void;
  /** Opens search across every conversation. */
  onSearch?: () => void;
  /** Starts a new conversation; offered only while the turn and the composer are free. */
  onNew?: () => void;
  /** A new conversation is being made. */
  making?: boolean;
  /** Puts Ask Alpha away. */
  onClose?: () => void;
  /** The conversation is full height. Its resize action shrinks it to the sheet. */
  expanded?: boolean;
  /** Expands the sheet, or shrinks the full screen back to the sheet. */
  onResize?: () => void;
};

/**
 * The top of the conversation: the resize handle, Alpha's mark with the conversation's name and what the agent is told
 * of the screen, and the ways to find or start a conversation.
 * @model spec/app/assistant/chats.md
 */
export function AssistantChatHeader({ title, context, grabber, onHistory, onSearch, onNew, making = false, onClose, expanded, onResize, className, ...props }: AssistantChatHeaderProps) {
  return (
    <header className={cn("relative flex shrink-0 flex-col", className)} {...props}>
      <div className="flex min-h-11 items-center gap-0.5 px-3 pb-1">
        <span aria-hidden className="mr-2.5 flex size-8.5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-alpha text-alpha-foreground"><Mark className="size-[118%] shrink-0" aria-hidden /></span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="min-w-0 text-base leading-snug font-semibold">
            {onHistory ? (
              <button type="button" aria-haspopup="dialog" aria-label={`Chats, ${title}`} onClick={onHistory} className={cn(focusRing, "flex min-h-11 w-full items-center rounded-md text-left")}><span className="truncate">{title}</span></button>
            ) : (
              <span className="block truncate py-2">{title}</span>
            )}
          </h2>
          {context ? <AssistantContextChip {...context} className={onHistory ? "-mt-2.5 mb-1" : undefined} /> : null}
        </div>
        {onSearch ? <Button variant="ghost" size="icon" aria-label="Search chats" onClick={onSearch}><Search /></Button> : null}
        {onNew || making ? <Button variant="ghost" size="icon" aria-label="New chat" loading={making} onClick={onNew}><MessageSquarePlus /></Button> : null}
        {onResize ? <Button variant="ghost" size="icon" aria-label={expanded ? "Shrink chat" : "Expand chat"} onClick={onResize}>{expanded ? <Minimize2 className="size-4.5" /> : <Maximize2 className="size-4.5" />}</Button> : null}
        {onClose ? <Button variant="ghost" size="icon" aria-label="Minimize chat" onClick={onClose}><ChevronDown className="size-5" /></Button> : null}
      </div>
      {grabber ? <div className="absolute top-0 left-1/2 -translate-x-1/2">{grabber}</div> : null}
    </header>
  );
}
