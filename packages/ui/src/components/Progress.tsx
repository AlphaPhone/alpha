import type { ComponentProps } from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "../lib/cn.ts";

export type ProgressProps = Omit<ComponentProps<typeof ProgressPrimitive.Root>, "children" | "aria-label" | "aria-labelledby"> & {
  /** What is being done, such as "Upload"; give this or `aria-labelledby`. */
  "aria-label"?: string;
  /** The id of what names the work, where it is in view. */
  "aria-labelledby"?: string;
} & ({ "aria-label": string } | { "aria-labelledby": string }) & {
  /** How much is done, from 0 to `max`; leave out while the amount is unknown. */
  value?: number | null;
  /** The value that means done. */
  max?: number;
};

/** A bar for work whose length is known, and a shimmer while it is not. It must be named, with `aria-label` or `aria-labelledby`. */
export function Progress({ value, max = 100, className, ...props }: ProgressProps) {
  const done = value == null ? null : Math.min(Math.max(value, 0), max);
  return (
    <ProgressPrimitive.Root value={done} max={max} className={cn("h-1.5 w-full overflow-hidden rounded-full bg-accent", className)} {...props}>
      <ProgressPrimitive.Indicator
        className={cn(
          "size-full origin-left rounded-full",
          done === null ? "bg-linear-to-r from-accent via-primary to-accent bg-size-[200%_100%] motion-safe:animate-shimmer" : "bg-primary transition-transform duration-base ease-standard",
        )}
        style={done === null ? undefined : { transform: `scaleX(${done / max})` }}
      />
    </ProgressPrimitive.Root>
  );
}
