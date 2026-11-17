import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn.ts";
import { Spinner } from "./Spinner.tsx";

const dotVariants = cva("size-3 shrink-0", {
  variants: { status: { ok: "text-ok", warn: "text-warn", error: "text-destructive", off: "text-muted-foreground", busy: "text-info" } },
});
const shapes = {
  ok: <circle cx="6" cy="6" r="5" />,
  warn: <path d="M6 .5 11.75 11H.25Z" />,
  error: <rect x="1" y="1" width="10" height="10" rx="2" />,
  off: <circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" strokeWidth="2" />,
};

export type StatusDotProps = Omit<ComponentProps<"span">, "children"> & {
  /** The state of the thing; each has its own color and shape. */
  status: NonNullable<VariantProps<typeof dotVariants>["status"]>;
  /** The state in a word, such as "Connected": shown beside the dot, or kept as its accessible name. */
  label: string;
  /** Keeps the word out of sight, where the dot stands in a tight space. */
  hideLabel?: boolean;
};

/** The state of something at a glance: a colored shape that always carries its word. */
export function StatusDot({ status, label, hideLabel = false, className, ...props }: StatusDotProps) {
  const named = hideLabel ? { role: "img", "aria-label": label } : {};
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm text-foreground", className)} {...named} {...props}>
      {status === "busy"
        ? <Spinner aria-hidden className={dotVariants({ status })} />
        : <svg aria-hidden viewBox="0 0 12 12" fill="currentColor" className={dotVariants({ status })}>{shapes[status]}</svg>}
      {hideLabel ? null : label}
    </span>
  );
}
