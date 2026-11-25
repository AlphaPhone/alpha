import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn.ts";

export type PrivateNoticeProps = ComponentProps<"p"> & { icon?: ReactNode };

/** What a private tab keeps: nothing once it closes. */
export function PrivateNotice({ className, icon, children, ...props }: PrivateNoticeProps) {
  return (
    <p role="note" aria-label="Private tab notice" className={cn("text-subject text-muted-foreground", className)} {...props}>
      {icon}
      <span>{children ?? "Private · cleared on close"}</span>
    </p>
  );
}
