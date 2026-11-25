import { type ComponentProps, type ReactNode, useId } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn.ts";

const rowsVariants = cva("flex flex-col overflow-hidden", {
  variants: { surface: { card: "rounded-group bg-secondary py-1 text-secondary-foreground", plain: "rounded-lg" } },
  defaultVariants: { surface: "card" },
});

export type ListGroupProps = Omit<ComponentProps<"section">, "children"> &
  VariantProps<typeof rowsVariants> & {
    /** What the rows have in common, above them. */
    heading?: string;
    /** The `ListRow`s. */
    children?: ReactNode;
  };

/** Rows that belong together: on a card on a screen, or `surface="plain"` on a sheet or a dialog, which is a surface already. */
export function ListGroup({ heading, surface, className, children, ...props }: ListGroupProps) {
  const id = useId();
  return (
    <section aria-labelledby={heading ? id : undefined} className={cn("flex flex-col gap-2", className)} {...props}>
      {heading ? <h2 id={id} className="px-3.5 pt-0.5 text-caption font-normal text-muted-foreground">{heading}</h2> : null}
      <div className={rowsVariants({ surface })}>{children}</div>
    </section>
  );
}
