import type { ReactNode } from "react";
import { cn } from "../lib/cn.ts";
import { Alert, type AlertProps } from "./Alert.tsx";

export type BannerProps = Omit<AlertProps, "variant"> & {
  /** How much it matters: `warn` and `destructive` interrupt a screen reader. */
  variant?: "info" | "warn" | "destructive";
  /** The one thing to do about it, usually a small `Button`. */
  action?: ReactNode;
};

/** A notice in the flow of a screen about the state it is in, with the one thing to do about it. */
export function Banner({ variant = "info", action, className, children, ...props }: BannerProps) {
  return (
    <Alert variant={variant} className={cn("items-center py-1.5 pr-2", className)} {...props}>
      <div className="flex min-h-11 items-center gap-2">
        <div className="min-w-0 flex-1 py-1">{children}</div>
        {action}
      </div>
    </Alert>
  );
}
