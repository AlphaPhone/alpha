import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn.ts";

export type MapsStatusCardProps = ComponentProps<"div"> & {
  /** What the owner should know before going on. */
  text: ReactNode;
  /** The buttons that answer it. */
  actions?: ReactNode;
};

/** A card over the map that says why Maps needs something, or what went wrong, with what to do next. */
export function MapsStatusCard({ text, actions, className, ...props }: MapsStatusCardProps) {
  return (
    <div className={cn("flex flex-col rounded-tile bg-background p-4 text-sm leading-relaxed text-muted-foreground ring-1 ring-border", className)} {...props}>
      <p>{text}</p>
      {actions ? <div className="mt-2.5 flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
