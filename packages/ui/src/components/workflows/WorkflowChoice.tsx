import type { ComponentProps, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

export type WorkflowChoiceProps = ComponentProps<"button"> & {
  /** What it adds, such as `Automation` or `Alarm`. */
  label: string;
  /** Why it cannot be added now, under its label. */
  description?: string;
  /** Its kind's glyph; decorative. */
  icon: ReactNode;
};

/** One thing the owner can add to Workflows, opening its editor or the app that keeps it. */
export function WorkflowChoice({ label, description, icon, className, ...props }: WorkflowChoiceProps) {
  return (
    <button type="button" className={cn(focusRing, "mb-1 grid min-h-16 w-full grid-cols-[--spacing(6)_minmax(0,1fr)_--spacing(4)] items-center gap-3.5 rounded-md bg-secondary px-3 py-3.5 text-left text-foreground disabled:opacity-50", className)} {...props}>
      <span aria-hidden className="flex [&_svg]:size-5.5">{icon}</span>
      <span className="min-w-0">
        <strong className="block text-md font-semibold">{label}</strong>
        {description && <small className="mt-0.5 block text-sm text-muted-foreground">{description}</small>}
      </span>
      <ChevronRight aria-hidden className="h-5.5 w-4 text-muted-foreground" />
    </button>
  );
}
