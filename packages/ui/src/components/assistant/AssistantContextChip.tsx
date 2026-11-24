import type { ComponentProps } from "react";
import { EyeOff, MousePointerClick } from "lucide-react";
import { cn } from "../../lib/cn.ts";

export type AssistantContextChipProps = Omit<ComponentProps<"p">, "children"> & {
  /** The view the agent is told is showing, such as "Calendar"; "Home" when none. */
  view: string;
  /** The day on the calendar the agent is told, in words, only from Calendar. */
  day?: string;
  /** Something is selected, and the agent is told so. */
  selected?: boolean;
  /** The screen is sensitive: the agent is told only that, and nothing is sent. */
  sensitive?: boolean;
};

/**
 * What the agent is told of the screen: the view, the day on Calendar, whether something is selected, or only that the screen is private.
 * @model spec/app/assistant/index.md
 */
export function AssistantContextChip({ view, day, selected = false, sensitive = false, className, ...props }: AssistantContextChipProps) {
  return (
    <p className={cn("flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground", className)} {...props}>
      {sensitive ? <EyeOff aria-label="Private screen" role="img" className="size-4 shrink-0" /> : null}
      <span className="truncate">{[view, day].filter(Boolean).join(" · ")}</span>
      {selected && !sensitive ? <MousePointerClick aria-label="Selection shared" role="img" className="size-4 shrink-0" /> : null}
    </p>
  );
}
