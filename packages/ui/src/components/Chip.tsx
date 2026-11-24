import type { ComponentProps } from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { X } from "lucide-react";
import { cn, focusRing } from "../lib/cn.ts";

export type ChipProps = ComponentProps<typeof TogglePrimitive.Root> & {
  /** Removes the filter; the clear control is shown only with it. */
  onClear?: () => void;
  /** The accessible name of the clear control; "Clear" and the chip's own name when left out, so each chip's differs. */
  clearLabel?: string;
};

/** A filter that is on or off, 44px tall; with `onClear`, a 32px filter in force with a second control that removes it. */
export function Chip({ onClear, clearLabel, disabled, className, children, ...props }: ChipProps) {
  const name = typeof children === "string" ? children : props["aria-label"];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-secondary text-secondary-foreground transition-colors duration-fast ease-standard has-disabled:opacity-50 has-data-[state=on]:bg-foreground has-data-[state=on]:text-background",
        onClear ? "h-8 gap-1 pl-3 text-caption" : "h-11 text-sm font-semibold",
        className,
      )}
    >
      <TogglePrimitive.Root disabled={disabled} className={cn(focusRing, "relative inline-flex min-w-11 items-center gap-1.5 rounded-full disabled:pointer-events-none", onClear ? "h-8 before:absolute before:inset-x-0 before:-inset-y-1.5" : "h-11 justify-center px-3")} {...props}>
        {children}
      </TogglePrimitive.Root>
      {onClear ? (
        <button type="button" aria-label={clearLabel ?? (name ? `Clear ${name}` : "Clear")} disabled={disabled} onClick={onClear} className={cn(focusRing, "-my-1.5 flex size-11 items-center justify-center rounded-full disabled:pointer-events-none")}>
          <X aria-hidden className="size-4" />
        </button>
      ) : null}
    </span>
  );
}
