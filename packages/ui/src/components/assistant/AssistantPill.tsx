import type { ComponentProps } from "react";
import { Keyboard, Mic } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { Mark } from "../Mark.tsx";

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
 * Ask Alpha at rest inside an app, as Alpha drew it before VibeStack: a small pill centred above the bottom edge with
 * Alpha's mark, Type and Talk, so the app keeps the screen.
 * @model spec/app/assistant/dock.md
 */
export function AssistantPill({ onOpen, onType, onTalk, onStop, className, ...props }: AssistantPillProps) {
  return (
    <div role="group" aria-label="Assistant controls" className={cn("pointer-events-none flex justify-center", className)} {...props}>
      <div className="pointer-events-auto flex touch-none items-center gap-0.5 rounded-dock bg-secondary p-1.25 text-secondary-foreground shadow-dock dark:shadow-dock-dark">
        <Button size="icon" aria-label="Open conversation" disabled={!onOpen} className="overflow-hidden bg-alpha text-alpha-foreground hover:bg-alpha/90" onClick={onOpen}><Mark aria-hidden className="size-[118%]" /></Button>
        {onType ? <Button variant="ghost" size="icon" aria-label="Type" className="hover:bg-transparent" onClick={onType}><Keyboard /></Button> : null}
        {onStop ? (
          <Button variant="ghost" size="icon" aria-label="Stop reply" className="hover:bg-transparent" onClick={onStop}><svg aria-hidden viewBox="0 0 24 24" className="size-5.5"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" /></svg></Button>
        ) : onTalk ? (
          <Button variant="ghost" size="icon" aria-label="Talk" className="hover:bg-transparent" onClick={onTalk}><Mic /></Button>
        ) : null}
      </div>
    </div>
  );
}
