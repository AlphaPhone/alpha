import type { ComponentProps } from "react";
import { SmilePlus } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

/** One aggregated emoji reaction chip on a message. */
export type MessageReaction = {
  /** The emoji glyph or short visual mark. */
  emoji: string;
  /** Number of people who added this reaction. */
  count: number;
  /** Whether the current user has reacted with this emoji. */
  reacted?: boolean;
  /** Accessible name of the emoji when clearer than the raw glyph. */
  label?: string;
};

export type ReactionBarProps = Omit<ComponentProps<"div">, "children"> & {
  /** Aggregated reactions displayed in order. */
  reactions: MessageReaction[];
  /** Toggles the current user's reaction for the selected emoji. */
  onToggle?: (emoji: string) => void;
  /** Opens a picker or adds a new reaction; shown only when provided. */
  onAdd?: () => void;
  /** Disables toggling and adding reactions. */
  disabled?: boolean;
};

/** Compact, accessible row of emoji reaction toggle chips with an optional quick-add control. */
export function ReactionBar({ reactions, onToggle, onAdd, disabled = false, className, ...props }: ReactionBarProps) {
  if (reactions.length === 0 && !onAdd) return null;
  return (
    <div role="group" aria-label="Reactions" className={cn("flex flex-wrap items-center gap-1.5", className)} {...props}>
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          aria-pressed={Boolean(reaction.reacted)}
          aria-label={`${reaction.label ?? reaction.emoji}, ${reaction.count}`}
          disabled={disabled || !onToggle}
          onClick={() => onToggle?.(reaction.emoji)}
          className={cn(
            focusRing,
            "relative inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors duration-fast ease-standard before:absolute before:-inset-1 disabled:pointer-events-none disabled:opacity-50",
            reaction.reacted
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-secondary text-secondary-foreground hover:bg-accent",
          )}
        >
          <span aria-hidden>{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </button>
      ))}
      {onAdd ? (
        <button
          type="button"
          aria-label="Add reaction"
          disabled={disabled}
          onClick={onAdd}
          className={cn(
            focusRing,
            "relative inline-flex size-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors duration-fast ease-standard hover:bg-accent hover:text-foreground before:absolute before:-inset-1 disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          <SmilePlus aria-hidden className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
