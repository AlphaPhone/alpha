import type { ComponentProps, ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { dockClearance } from "../../lib/styles.ts";

type NoteViewFrameProps = Omit<ComponentProps<"section">, "title"> & {
  title: string;
  menu?: ReactNode;
  onBack?: () => void;
  bodyClassName?: string;
};

/** The open note's surface, with Back and its actions above its contents. */
export function noteViewFrame({ title, menu, onBack, bodyClassName, children, className, ...props }: NoteViewFrameProps) {
  return (
    <section aria-label={title} className={cn("absolute inset-0 z-10 flex flex-col bg-background", className)} {...props}>
      <div className="flex h-13 shrink-0 items-center gap-0.5 px-2">
        <button type="button" aria-label="Back to notes" onClick={onBack} className={cn(focusRing, "flex size-13 shrink-0 items-center justify-center rounded-full active:bg-accent")}><ChevronLeft aria-hidden className="size-5.5" /></button>
        <div className="grow" />
        {menu}
      </div>
      <div className={cn(dockClearance, "min-h-0 grow touch-pan-y overflow-y-auto px-6 pt-1", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}
