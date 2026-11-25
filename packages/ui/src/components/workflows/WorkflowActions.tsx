import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { Ellipsis } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

export type WorkflowActionsProps = Omit<ComponentProps<"details">, "children"> & {
  /** The name of the round button that opens the menu, such as `Workflow actions`. */
  label: string;
  /** Which edge of the button the menu lines up with. */
  align?: "start" | "end";
  /** The menu's `WorkflowAction`s. */
  children: ReactNode;
};

export type WorkflowActionProps = ComponentProps<"button"> & {
  /** A glyph before its words; decorative. */
  icon?: ReactNode;
};

/** A workflow's further actions, behind a round "…" button beside its run button; choosing one closes the menu. */
export function WorkflowActions({ label, align = "start", className, children, ...props }: WorkflowActionsProps) {
  return (
    <details className={cn("relative", className)} {...props}>
      <summary aria-label={label} title={label} className={cn(focusRing, "grid size-11 cursor-pointer list-none place-items-center rounded-full bg-secondary [&::-webkit-details-marker]:hidden")}>
        <Ellipsis aria-hidden className="size-5.5" />
      </summary>
      <div className={cn("absolute z-dialog min-w-40 rounded-lg border border-border bg-background p-1 text-foreground shadow-menu", align === "end" ? "right-0" : "left-0")}>
        {children}
      </div>
    </details>
  );
}

/** One action in a `WorkflowActions` menu. */
export function WorkflowAction({ icon, className, children, onClick, ...props }: WorkflowActionProps) {
  const choose = (event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.closest("details")?.removeAttribute("open");
    onClick?.(event);
  };
  return (
    <button type="button" className={cn(focusRing, "flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-start text-base disabled:opacity-50 aria-disabled:opacity-45 [&_svg]:size-5.5 [&_svg]:shrink-0", className)} onClick={choose} {...props}>
      {icon}<span className="min-w-0 wrap-anywhere">{children}</span>
    </button>
  );
}
