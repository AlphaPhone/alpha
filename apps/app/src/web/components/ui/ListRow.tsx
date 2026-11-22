import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps, ReactNode } from "react";
import { cn, focusRing } from "../../lib/cn.ts";

export type ListRowProps = Omit<ComponentProps<"button">, "title"> & {
  /** The row's main text. */
  title: ReactNode;
  /** One line of metadata under the title. */
  detail?: ReactNode;
  /** An icon, avatar or thumbnail at the start. */
  leading?: ReactNode;
  /** A value, time or control at the end. */
  trailing?: ReactNode;
  /** Renders the row as its child, such as a link. */
  asChild?: boolean;
  /** Marks the row as the current selection. */
  selected?: boolean;
};

/** One row of a list: a person, a note, a file, a setting. The whole row is the target. */
export function ListRow({ title, detail, leading, trailing, asChild, selected, className, children, ...props }: ListRowProps) {
  const Row = asChild ? Slot : "button";
  return (
    <Row type={asChild ? undefined : "button"} aria-current={selected || undefined} className={cn(focusRing, "flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-accent disabled:opacity-50 aria-[current=true]:bg-secondary", className)} {...props}>
      {asChild ? children : (
        <>
          {leading && <span className="flex size-10 shrink-0 items-center justify-center">{leading}</span>}
          <span className="min-w-0 flex-1">
            <span className="block truncate">{title}</span>
            {detail && <span className="block truncate text-sm text-muted-foreground">{detail}</span>}
          </span>
          {trailing && <span className="shrink-0 text-sm text-muted-foreground tabular-nums">{trailing}</span>}
        </>
      )}
    </Row>
  );
}
