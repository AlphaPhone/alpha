import type { ComponentProps, ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { dockClearance } from "../../lib/styles.ts";

type NoteFrameOptions = Omit<ComponentProps<"section">, "title"> & {
  title: string;
  menu?: ReactNode;
  onBack?: () => void;
  bodyClassName?: string;
  children?: ReactNode;
};

/** Shared full-screen note view shell: back button, optional menu, and scrollable body. */
export function renderNoteView({ title, menu, onBack, className, bodyClassName, children, ...props }: NoteFrameOptions) {
  return (
    <section aria-label={title} className={cn("absolute inset-0 z-10 flex flex-col bg-background", className)} {...props}>
      <div className="flex h-14 shrink-0 items-center gap-0.5 px-2">
        <button type="button" aria-label="Back to notes" onClick={onBack} className={cn(focusRing, "flex size-13 shrink-0 items-center justify-center rounded-full active:bg-accent")}>
          <ChevronLeft aria-hidden className="size-5.5" />
        </button>
        <div className="grow" />
        {menu}
      </div>
      <div className={cn(dockClearance, "min-h-0 grow touch-pan-y overflow-y-auto px-6 pt-1", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}
