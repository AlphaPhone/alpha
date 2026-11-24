import type { ComponentProps, ReactNode } from "react";
import { MessageSquarePlus, Search, X } from "lucide-react";
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
};

/**
 * The top of the conversation: the resize handle, Alpha's mark with the conversation's name and what the agent is told
 * of the screen, and the ways to find or start a conversation.
 * @model spec/app/assistant/chats.md
 */
export function AssistantChatHeader({ title, context, grabber, onHistory, onSearch, onNew, making = false, onClose, className, ...props }: AssistantChatHeaderProps) {
  return (
    <header className={cn("flex flex-col", className)} {...props}>
      {grabber}
      <div className="flex min-h-14 items-center gap-1 pr-1 pl-4">
        <span aria-hidden className="mr-2 flex size-9 shrink-0 items-center justify-center rounded-full bg-alpha text-alpha-foreground"><Mark className="size-5" aria-hidden /></span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="min-w-0 text-lg leading-snug font-semibold">
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
        {onClose ? <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}><X /></Button> : null}
      </div>
    </header>
  );
}
