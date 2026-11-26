import type { ComponentProps } from "react";
import { X } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

export type AssistantQuoteBarProps = Omit<ComponentProps<"div">, "children"> & {
  /** A message being quoted by the next send, or one being edited to send again. */
  kind: "quote" | "editing";
  /** The quoted message; the first lines show. */
  text?: string;
  /** Takes the quote or the editing mark off while keeping whatever is in the field. */
  onRemove?: () => void;
};

/**
 * The message the next send quotes, or a sign that the one being written is an earlier message edited to send again.
 * @model spec/app/assistant/composer.md
 */
export function AssistantQuoteBar({ kind, text, onRemove, className, ...props }: AssistantQuoteBarProps) {
  return (
    <div className={cn("flex min-h-11 items-center gap-2 rounded-md bg-secondary py-1.5 pl-4 text-caption text-secondary-foreground", onRemove ? "pr-1.5" : "pr-4", className)} {...props}>
      <span className="line-clamp-2 min-w-0 flex-1 break-words">{kind === "quote" ? text : "Editing to send again"}</span>
      {onRemove ? (
        <button type="button" aria-label={kind === "quote" ? "Remove quote" : "Stop editing"} onClick={onRemove} className={cn(focusRing, "flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-fast ease-standard motion-reduce:transition-none hover:bg-accent")}>
          <X aria-hidden className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
