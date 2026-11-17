import type { ComponentProps, ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "../lib/cn.ts";
import { DialogOverlay } from "./Dialog.tsx";

export type SheetProps = ComponentProps<typeof DialogPrimitive.Root>;
export type SheetContentProps = Omit<ComponentProps<typeof DialogPrimitive.Content>, "title"> & {
  /** The sheet's heading and accessible name. */
  title: string;
  /** What the sheet is about, under its title. */
  description?: ReactNode;
  /** The sheet's buttons, in a row at its foot, each as wide as the others. */
  actions?: ReactNode;
};

/** A task that rises from the foot of the screen: holds a `SheetTrigger` and a `SheetContent`. */
export function Sheet(props: SheetProps) {
  return <DialogPrimitive.Root {...props} />;
}

/** Opens the sheet; pass `asChild` to use a `Button`. */
export const SheetTrigger = DialogPrimitive.Trigger;

/** Closes the sheet; pass `asChild` to use a `Button`. */
export const SheetClose = DialogPrimitive.Close;

/** The panel at the foot of a dimmed page: its title, a body that scrolls, and its actions. Escape and a press outside dismiss it. */
export function SheetContent({ title, description, actions, className, children, ...props }: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay className="z-sheet" />
      <DialogPrimitive.Content
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "fixed inset-x-0 bottom-0 z-sheet mx-auto flex max-h-[85dvh] max-w-xl flex-col gap-4 rounded-t-sheet bg-popover px-5 pt-6 pb-[max(--spacing(5),env(safe-area-inset-bottom))] text-popover-foreground shadow-sheet outline-none motion-safe:animate-rise",
          className,
        )}
        {...props}
      >
        <div className="flex flex-col gap-1">
          <DialogPrimitive.Title className="text-xl font-semibold">{title}</DialogPrimitive.Title>
          {description ? <DialogPrimitive.Description className="text-sm text-muted-foreground">{description}</DialogPrimitive.Description> : null}
        </div>
        {children ? <div className="-mx-5 min-h-0 flex-1 overflow-y-auto px-5">{children}</div> : null}
        {actions ? <div className="flex gap-2 *:flex-1">{actions}</div> : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
