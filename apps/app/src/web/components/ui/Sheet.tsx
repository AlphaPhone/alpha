import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn, focusRing } from "../../lib/cn.ts";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const sheetVariants = cva(
  "fixed z-50 flex flex-col gap-4 bg-background text-foreground shadow-lg transition-transform duration-slow ease-sheet motion-reduce:transition-none",
  {
    variants: {
      side: {
        bottom: "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-xl pb-[env(safe-area-inset-bottom)] data-[state=closed]:translate-y-full",
        top: "inset-x-0 top-0 rounded-b-xl pt-[env(safe-area-inset-top)] data-[state=closed]:-translate-y-full",
        full: "inset-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
      },
    },
    defaultVariants: { side: "bottom" },
  },
);

export type SheetContentProps = ComponentProps<typeof DialogPrimitive.Content> & VariantProps<typeof sheetVariants> & {
  /** The sheet's accessible name; shown as its one title unless `hideTitle`. */
  title: string;
  /** Keeps the title for assistive technology only. */
  hideTitle?: boolean;
};

/** A sheet that rises over the scrim from an edge of the screen and holds focus until it closes. */
export function SheetContent({ className, side, title, hideTitle, children, ...props }: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim" />
      <DialogPrimitive.Content className={cn(sheetVariants({ side }), className)} {...props}>
        <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border" />
        <DialogPrimitive.Title className={cn("px-5 font-serif text-2xl", hideTitle && "sr-only")}>{title}</DialogPrimitive.Title>
        {children}
        <DialogPrimitive.Close aria-label="Close" className={cn(focusRing, "sr-only focus:not-sr-only")} />
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
