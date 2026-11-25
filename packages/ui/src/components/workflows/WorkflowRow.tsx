import type { ComponentProps, ReactNode } from "react";
import { ChevronRight, Info } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

export type WorkflowRowProps = Omit<ComponentProps<"button">, "title"> & {
  /** The routine's name. */
  title: string;
  /** When it runs, or where it comes from, in a few words. */
  summary?: string;
  /** Marks a summary that says the last run failed. */
  failed?: boolean;
  /** Its standing, such as `Active`, `Paused` or `Removed`. */
  status?: string;
  /** What kind of routine it is: a reminder's bell, a prompt's spark, a schedule's calendar; decorative. */
  icon?: ReactNode;
  /** A control beside the row, such as its on or off `Switch`. */
  trailing?: ReactNode;
};

/** One routine in the Workflows list: its kind, its name, when it runs and its standing, opening it in one press. */
export function WorkflowRow({ title, summary, failed = false, status, icon, trailing, className, ...props }: WorkflowRowProps) {
  return (
    <li className="flex items-center gap-3 border-b border-border">
      <button type="button" className={cn(focusRing, "flex min-h-18 min-w-0 flex-1 items-center gap-3 px-1 py-4 text-left focus-visible:-outline-offset-focus aria-disabled:opacity-55", className)} {...props}>
        {icon ? <span aria-hidden className="flex shrink-0 [&_svg]:size-5.5">{icon}</span> : null}
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-lg leading-detail break-words">{title}</span>
          {summary && (
            <span className="flex items-start gap-1.5 text-sm leading-transcript break-words text-muted-foreground">
              {failed && <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-foreground" />}
              <span>{summary}</span>
            </span>
          )}
          {status && <span className="text-xs leading-normal text-muted-foreground">{status}</span>}
        </span>
        <ChevronRight aria-hidden className="ml-auto size-5.5 shrink-0 text-muted-foreground" />
      </button>
      {trailing}
    </li>
  );
}
