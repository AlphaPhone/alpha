import type { ComponentProps, ReactNode } from "react";
import { cn, focusRing } from "../../lib/cn.ts";

export type CalendarNoticeProps = Omit<ComponentProps<"div">, "role"> & {
  /** `caution` leads with an amber dot: something is unconfirmed or did not happen. */
  tone?: "plain" | "caution";
  /** What can be done about it, at the end. */
  actions?: ReactNode;
};

/** A line of Calendar's state over the days, such as a deletion to undo or a read that failed: a quiet pill with its actions. */
export function CalendarNotice({ tone = "plain", actions, className, children, ...props }: CalendarNoticeProps) {
  return (
    <div role="status" className={cn("mx-4 mb-2 flex shrink-0 flex-wrap items-center gap-2 rounded-tile bg-secondary py-1 pr-1 pl-3 text-meta leading-plain", className)} {...props}>
      {tone === "caution" ? <span aria-hidden className="size-2 shrink-0 rounded-full bg-warn" /> : null}
      <span className="min-w-0 flex-1">{children}</span>
      {actions}
    </div>
  );
}

/** An action of a notice or an event's page: 44px tall, quiet, its words in the text color. */
export function CalendarNoticeAction({ className, ...props }: ComponentProps<"button">) {
  return <button type="button" className={cn(focusRing, "inline-flex min-h-11 items-center gap-1 rounded-full px-2.5 font-semibold active:bg-accent disabled:opacity-50 [&_svg]:size-4.5", className)} {...props} />;
}
