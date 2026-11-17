import { type ComponentProps, type ReactNode, useId } from "react";
import { cn } from "../lib/cn.ts";

export type ListGroupProps = Omit<ComponentProps<"section">, "children"> & {
  /** What the rows have in common, above them. */
  heading?: string;
  /** The `ListRow`s. */
  children?: ReactNode;
};

/** Rows that belong together, on one card. */
export function ListGroup({ heading, className, children, ...props }: ListGroupProps) {
  const id = useId();
  return (
    <section aria-labelledby={heading ? id : undefined} className={cn("flex flex-col gap-2", className)} {...props}>
      {heading ? <h2 id={id} className="px-4 text-xs font-semibold tracking-caps text-muted-foreground uppercase">{heading}</h2> : null}
      <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground">{children}</div>
    </section>
  );
}
