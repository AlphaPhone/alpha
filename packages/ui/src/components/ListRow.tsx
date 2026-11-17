import type { ReactNode } from "react";
import { cn, focusRing } from "../lib/cn.ts";

export type ListRowProps = {
  /** What the row is, in a few words. */
  title: ReactNode;
  /** A second line that says more, in quieter type. */
  detail?: ReactNode;
  /** An icon or an `Avatar` before the title. */
  leading?: ReactNode;
  /** A value, a `StatusDot` or a control at the end; a row with `onClick` takes nothing pressable here. */
  trailing?: ReactNode;
  /** Makes the whole row a button that does this. */
  onClick?: () => void;
  /** Marks the row whose detail is showing beside the list. */
  selected?: boolean;
  /** Refuses presses on a row with `onClick`. */
  disabled?: boolean;
  className?: string;
};

/** One thing in a list: what it is, what is known about it, and one press to open it when it has an action. */
export function ListRow({ title, detail, leading, trailing, onClick, selected = false, disabled = false, className }: ListRowProps) {
  const row = cn("flex min-h-13 w-full items-center gap-3 px-4 py-2 text-left text-foreground", selected && "bg-accent", className);
  const content = (
    <>
      {leading ? <span className="flex shrink-0 items-center text-muted-foreground [&_svg:not([class*='size-'])]:size-5.5">{leading}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base font-medium">{title}</span>
        {detail ? <span className="truncate text-sm text-muted-foreground">{detail}</span> : null}
      </span>
      {trailing ? <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">{trailing}</span> : null}
    </>
  );
  if (!onClick) return <div aria-current={selected || undefined} className={row}>{content}</div>;
  return (
    <button
      type="button"
      aria-current={selected || undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(focusRing, "transition-colors duration-fast ease-standard hover:bg-accent/60 focus-visible:ring-inset active:bg-accent disabled:pointer-events-none disabled:opacity-50", row)}
    >
      {content}
    </button>
  );
}
