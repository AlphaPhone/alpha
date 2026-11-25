import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

export type PrivateMarkProps = ComponentProps<"svg">;

/** The mark of a private tab: a mask, named for assistive technology. */
export function PrivateMark({ className, ...props }: PrivateMarkProps) {
  return (
    <svg role="img" aria-label="Private tab" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={cn("size-5.5 shrink-0", className)} {...props}>
      <path d="M2 12a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V7h-5a8 8 0 0 0-5 2 8 8 0 0 0-5-2H2zM6 11c1.5 0 3 .5 3 2-2 0-3 0-3-2zM18 11c-1.5 0-3 .5-3 2 2 0 3 0 3-2z" />
    </svg>
  );
}
