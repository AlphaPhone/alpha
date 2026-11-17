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

/** A filter that is on or off, and with `onClear` a second control that removes it. */
export function Chip({ onClear, clearLabel, disabled, className, children, ...props }: ChipProps) {
  const name = typeof children === "string" ? children : props["aria-label"];
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center rounded-full bg-secondary text-sm font-medium text-secondary-foreground transition-colors duration-fast ease-standard has-disabled:opacity-50 has-data-[state=on]:bg-foreground has-data-[state=on]:text-background",
        className,
      )}
    >
      <TogglePrimitive.Root disabled={disabled} className={cn(focusRing, "relative h-9 min-w-11 rounded-full px-4 before:absolute before:inset-x-0 before:-inset-y-1 disabled:pointer-events-none", onClear && "pr-1")} {...props}>
        {children}
      </TogglePrimitive.Root>
      {onClear ? (
        <button type="button" aria-label={clearLabel ?? (name ? `Clear ${name}` : "Clear")} disabled={disabled} onClick={onClear} className={cn(focusRing, "relative flex size-9 items-center justify-center rounded-full before:absolute before:-inset-1 disabled:pointer-events-none")}>
          <X aria-hidden className="size-4" />
        </button>
      ) : null}
    </span>
  );
}
