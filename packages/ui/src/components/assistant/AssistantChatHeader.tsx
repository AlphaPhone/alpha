import type { ComponentProps, ReactNode } from "react";
import { ChevronDown, ChevronLeft, Maximize2, Minimize2, X } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { Mark } from "../Mark.tsx";
import { AssistantContextChip, type AssistantContextChipProps } from "./AssistantContextChip.tsx";

export type AssistantChatHeaderProps = Omit<ComponentProps<"header">, "title" | "children"> & {
  /** The conversation's name, read out with the way Home. */
  title: string;
  /** What the agent is told of the screen showing; shown only when it is more than the view: a selection, or a private screen. */
  context?: AssistantContextChipProps;
  /** What the conversation is beside, under Alpha's mark, such as the person and app a communications sheet is over. */
  subtitle?: ReactNode;
  /** The handle that resizes the sheet, in the middle: an `AssistantGrabber`. */
  grabber?: ReactNode;
  /** Goes Home: the back mark and Alpha's mark at the start. */
  onHome?: () => void;
  /** Lowers Ask Alpha or returns from the phone's assistant entry. */
  onClose?: () => void;
  returnOnClose?: boolean;
  /** The conversation is full height. Its resize action shrinks it to the sheet. */
  expanded?: boolean;
  /** Expands the sheet, or shrinks the full screen back to the sheet. */
  onResize?: () => void;
};

/**
 * The top of the conversation: the way Home with Alpha's mark, the resize handle in the middle, and the controls that
 * fill the screen or lower Ask Alpha.
 * @model spec/app/assistant/chats.md
 */
export function AssistantChatHeader({ title, context, subtitle, grabber, onHome, onClose, returnOnClose = false, expanded = false, onResize, className, ...props }: AssistantChatHeaderProps) {
  const told = context && (context.sensitive || context.selected) ? context : undefined;
  return (
    <header className={cn("grid shrink-0 grid-cols-[minmax(0,1fr)_2.75rem_minmax(0,1fr)] items-center px-3 pb-1", className)} {...props}>
      <div className="flex min-w-0 items-center gap-0.5">
        <button
          type="button"
          aria-label={returnOnClose ? "Back to the previous app" : "Go Home"}
          aria-description={title}
          disabled={!onHome}
          onClick={onHome}
          className={cn(focusRing, "flex min-h-11 min-w-0 items-center gap-3 rounded-sm text-left")}
        >
          <ChevronLeft aria-hidden className="-mr-2 size-4.5 shrink-0" />
          <span aria-hidden className="flex size-8.5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-alpha text-alpha-foreground"><Mark aria-hidden className="size-full shrink-0 scale-[1.18]" /></span>
          {subtitle ? <span className="min-w-0 truncate text-caption text-muted-foreground">{subtitle}</span> : null}
        </button>
        {told ? <AssistantContextChip {...told} className="ml-2.5" /> : null}
      </div>
      {grabber ?? <span />}
      <div className="col-start-3 flex min-w-0 items-center justify-end gap-0.5">
        {onResize ? (
          <Button variant="ghost" size="icon" aria-label={expanded ? "Shrink chat" : "Expand chat"} className="hover:bg-transparent" onClick={onResize}>
            {expanded ? <Minimize2 aria-hidden className="size-4.5" /> : <Maximize2 aria-hidden className="size-4.5" />}
          </Button>
        ) : null}
        {onClose ? <Button variant="ghost" size="icon" aria-label={returnOnClose ? "Close Ask Alpha" : "Minimize chat"} className="hover:bg-transparent" onClick={onClose}>{returnOnClose ? <X aria-hidden className="size-5" /> : <ChevronDown aria-hidden className="size-5" />}</Button> : null}
      </div>
    </header>
  );
}
