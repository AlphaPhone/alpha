import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cn, focusRing } from "../lib/cn.ts";

export type ListRowProps = Omit<ComponentProps<"button">, "title"> & {
  /** What the row is, in a few words; it wraps to a second line rather than being cut. */
  title: ReactNode;
  /** A second line that says more, in quieter type. */
  detail?: ReactNode;
  /** An icon or an `Avatar` before the title; decorative, so hidden from assistive technology. */
  leading?: ReactNode;
  /** A value, a `StatusDot` or a control at the end; a row that is a button or a link takes nothing pressable here. */
  trailing?: ReactNode;
  /** Marks the row whose detail is showing beside the list. */
  selected?: boolean;
  /**
   * Renders the single child element as the row, for a row that is a link, or a `<label htmlFor>` whose whole
   * surface operates the `Switch` in `trailing`.
   */
  asChild?: boolean;
  /** With `asChild`, the element the row becomes. */
  children?: ReactNode;
};

const refuse = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

/**
 * One thing in a list: what it is, what is known about it, and one press to open it when it has an action. Given a
 * press handler, its own or a Radix trigger's through `asChild` on the trigger, the row is a button; with `asChild`
 * it is the element it is given.
 */
export function ListRow({ title, detail, leading, trailing, selected = false, asChild = false, disabled = false, className, children, ...props }: ListRowProps) {
  const pressable = asChild || Boolean(props.onClick ?? props.onPointerDown ?? props.onKeyDown);
  const row = cn(
    "flex min-h-13 w-full items-center gap-3 px-4 py-2 text-left text-foreground",
    pressable && [focusRing, "transition-colors duration-fast ease-standard hover:bg-accent/60 focus-visible:-outline-offset-focus active:bg-accent disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50"],
    selected && "bg-accent",
    className,
  );
  const content = (
    <>
      {leading ? <span aria-hidden className="flex shrink-0 items-center text-muted-foreground [&_svg:not([class*='size-'])]:size-5.5">{leading}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="line-clamp-2 text-base font-medium break-words">{title}</span>
        {detail ? <span className="truncate text-sm text-muted-foreground">{detail}</span> : null}
      </span>
      {trailing ? <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">{trailing}</span> : null}
    </>
  );
  if (asChild) {
    const refused = disabled ? { "aria-disabled": true, tabIndex: -1, onClickCapture: refuse } : {};
    return (
      <Slot aria-current={selected || undefined} className={row} {...props} {...refused}>
        <Slottable>{children}</Slottable>
        {content}
      </Slot>
    );
  }
  if (!pressable) return <div aria-current={selected || undefined} className={row} {...(props as ComponentProps<"div">)}>{content}</div>;
  return (
    <button type="button" aria-current={selected || undefined} disabled={disabled} className={row} {...props}>
      {content}
    </button>
  );
}
