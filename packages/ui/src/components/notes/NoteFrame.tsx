import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

export type NoteFrameProps = Omit<ComponentPropsWithoutRef<"section">, "title"> & {
  title: string;
  menu?: ReactNode;
  onBack?: () => void;
};

/** Shared full-screen note scaffold with back button and optional menu slot. */
export function NoteFrame({ title, menu, onBack, className, children, ...props }: NoteFrameProps) {
  return (
    <section aria-label={title} className={cn("absolute inset-0 z-10 flex flex-col bg-background", className)} {...props}>
      <div className="flex h-14 shrink-0 items-center gap-0.5 px-2">
        <button type="button" aria-label="Back to notes" onClick={onBack} className={cn(focusRing, "flex size-13 shrink-0 items-center justify-center rounded-full active:bg-accent")}>
          <ChevronLeft aria-hidden className="size-5.5" />
        </button>
        <div className="grow" />
        {menu}
      </div>
      {children}
    </section>
  );
}
