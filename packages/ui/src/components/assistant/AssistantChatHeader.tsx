import type { ComponentProps, ReactNode } from "react";
import { ChevronDown, ChevronLeft, Maximize2, Minimize2 } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { AssistantContextChip, type AssistantContextChipProps } from "./AssistantContextChip.tsx";
import { AssistantMark } from "./AssistantMark.tsx";

export type AssistantChatHeaderProps = Omit<ComponentProps<"header">, "title" | "children"> & {
  /** The conversation's name. */
  title: string;
  /** What the agent is told of the screen showing. */
  context?: AssistantContextChipProps;
  /** The handle that resizes the sheet, in the middle: an `AssistantGrabber`. */
  grabber?: ReactNode;
  /** Leaves Ask Alpha and every app for Home: the back chevron, the mark and the name are this one control. */
  onHome?: () => void;
  /** Ask Alpha fills the screen: the size control then makes it a sheet again. */
  full?: boolean;
  /** Fills the screen with the sheet, or makes the full screen a sheet again. */
  onResize?: () => void;
  /** Puts Ask Alpha away, back to its bar. */
  onMinimize?: () => void;
};

/**
 * The top of the conversation, as Alpha drew it before VibeStack: on the left one Go Home control with the back chevron,
 * Alpha's mark and the conversation's name with what the agent is told of the screen; the handle in the middle; the
 * size toggle and Minimize on the right.
 * @model spec/app/assistant/chats.md
 */
export function AssistantChatHeader({ title, context, grabber, onHome, full = false, onResize, onMinimize, className, ...props }: AssistantChatHeaderProps) {
  const where = context ? [context.view, context.day].filter(Boolean).join(" · ") : undefined;
  const lead = (
    <>
      <ChevronLeft aria-hidden className="-mr-2 size-4.5 shrink-0" />
      <AssistantMark className="size-8.5" />
      <span className="flex min-w-0 flex-col max-sm:hidden">
        <span className="truncate text-base font-semibold">{title}</span>
        {context ? <AssistantContextChip {...context} /> : null}
      </span>
    </>
  );
  return (
    <header className={cn("grid shrink-0 grid-cols-[minmax(0,1fr)_2.75rem_minmax(0,1fr)] items-center px-3 pb-1", className)} {...props}>
      <div className="flex min-w-0 items-center gap-0.5">
        {onHome ? (
          <button type="button" aria-label="Go Home" aria-description={where} onClick={onHome} className={cn(focusRing, "flex min-h-11 min-w-0 items-center gap-3 rounded-md text-left active:bg-accent")}>{lead}</button>
        ) : (
          <span className="flex min-h-11 min-w-0 items-center gap-3">{lead}</span>
        )}
      </div>
      <div className="flex justify-center">{grabber}</div>
      <div className="col-start-3 flex min-w-0 items-center justify-end gap-0.5">
        {onResize ? (
          <Button variant="ghost" size="icon" aria-label={full ? "Collapse chat" : "Expand chat"} onClick={onResize}>{full ? <Minimize2 className="size-4.5" /> : <Maximize2 className="size-4.5" />}</Button>
        ) : null}
        {onMinimize ? <Button variant="ghost" size="icon" aria-label="Minimize chat" onClick={onMinimize}><ChevronDown className="size-5" /></Button> : null}
      </div>
    </header>
  );
}
