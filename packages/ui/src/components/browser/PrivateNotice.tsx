import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

export type PrivateNoticeProps = ComponentProps<"p">;

/** What a private tab keeps: nothing once it closes. */
export function PrivateNotice({ className, ...props }: PrivateNoticeProps) {
  return (
    <p role="note" aria-label="Private tab notice" className={cn("text-subject text-muted-foreground", className)} {...props}>
      Private · cleared on close
    </p>
  );
}
