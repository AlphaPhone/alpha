import type { ComponentProps } from "react";
import { Keyboard, Mic, Square } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { AssistantMark } from "./AssistantMark.tsx";

export type AssistantPillProps = Omit<ComponentProps<"div">, "children"> & {
  /** Opens the conversation as a sheet: Alpha's mark. */
  onOpen?: () => void;
  /** Raises the bar to type a message. */
  onType?: () => void;
  /** Starts a spoken turn; the voice area owns it. */
  onTalk?: () => void;
  /** Stops the reply in flight, in Talk's place. */
  onStop?: () => void;
};

/**
 * Ask Alpha at rest inside an app: a small pill centred above the bottom edge with Alpha's mark, Type and Talk, so the
 * app keeps the screen, as Alpha had it before VibeStack.
 * @model spec/app/assistant/dock.md
 */
export function AssistantPill({ onOpen, onType, onTalk, onStop, className, ...props }: AssistantPillProps) {
  return (
    <div role="group" aria-label="Assistant controls" className={cn("pointer-events-none flex justify-center", className)} {...props}>
      <div className="pointer-events-auto flex touch-none items-center gap-0.5 rounded-full bg-secondary p-1.25 text-secondary-foreground shadow-lg">
        <button type="button" aria-label="Open conversation" disabled={!onOpen} onClick={onOpen} className={cn(focusRing, "rounded-full")}><AssistantMark /></button>
        {onType ? <Button variant="ghost" size="icon" aria-label="Type" onClick={onType}><Keyboard /></Button> : null}
        {onStop ? (
          <Button variant="ghost" size="icon" aria-label="Stop reply" onClick={onStop}><Square fill="currentColor" className="size-4" /></Button>
        ) : onTalk ? (
          <Button variant="ghost" size="icon" aria-label="Talk" onClick={onTalk}><Mic /></Button>
        ) : null}
      </div>
    </div>
  );
}
