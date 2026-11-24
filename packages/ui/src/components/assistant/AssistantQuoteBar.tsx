import type { ComponentProps } from "react";
import { CornerUpLeft, Pencil, X } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

export type AssistantQuoteBarProps = Omit<ComponentProps<"div">, "children"> & {
  /** A message being quoted by the next send, or one being edited to send again. */
  kind: "quote" | "editing";
  /** The quoted message; the first lines show. */
  text?: string;
  /** Takes the quote off; a quote can be removed, an edit stays until it is sent. */
  onRemove?: () => void;
};

/**
 * The message the next send quotes, or a sign that the one being written is an earlier message edited to send again.
 * @model spec/app/assistant/composer.md
 */
export function AssistantQuoteBar({ kind, text, onRemove, className, ...props }: AssistantQuoteBarProps) {
  const Icon = kind === "quote" ? CornerUpLeft : Pencil;
  return (
    <div className={cn("flex min-h-11 items-center gap-2 rounded-lg bg-secondary pl-3 text-sm text-secondary-foreground", className)} {...props}>
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <span className="line-clamp-2 min-w-0 flex-1 break-words">{kind === "quote" ? text : "Editing to send again"}</span>
      {onRemove ? (
        <button type="button" aria-label="Remove quote" onClick={onRemove} className={cn(focusRing, "flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-fast ease-standard hover:bg-accent")}>
          <X aria-hidden className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
