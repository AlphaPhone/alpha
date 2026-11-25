import type { ComponentProps, ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "../lib/cn.ts";
import { isInToastRegion, useLayerRef, usePortalContainer } from "../lib/layers.tsx";
import { surfaceDescription, surfaceTitle } from "../lib/styles.ts";
import { DialogOverlay } from "./Dialog.tsx";

export type SheetProps = ComponentProps<typeof DialogPrimitive.Root>;
export type SheetTriggerProps = ComponentProps<typeof DialogPrimitive.Trigger>;
export type SheetCloseProps = ComponentProps<typeof DialogPrimitive.Close>;
export type SheetContentProps = Omit<ComponentProps<typeof DialogPrimitive.Content>, "title"> & {
  /** The sheet's heading and accessible name. */
  title: string;
  /** What the sheet is about, under its title. */
  description?: ReactNode;
  /** The sheet's buttons, in a row at its foot, each as wide as the others. */
  actions?: ReactNode;
  /** An enclosing container for the sheet's portal. */
  container?: HTMLElement;
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
export function SheetContent({ title, description, actions, container, className, children, ref, onPointerDownOutside, onInteractOutside, ...props }: SheetContentProps) {
  const defaultContainer = usePortalContainer();
  const layerRef = useLayerRef("SheetLayer", ref);
  return (
    <DialogPrimitive.Portal container={container ?? defaultContainer}>
      <DialogOverlay className="z-sheet" />
      <DialogPrimitive.Content
        ref={layerRef}
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "fixed inset-x-0 bottom-0 z-sheet mx-auto flex max-h-[min(85dvh,calc(var(--alpha-viewport-height,100dvh)-2rem))] max-w-xl flex-col gap-4 rounded-t-sheet border-t border-border/60 bg-popover px-5 pt-6 pb-[max(--spacing(5),var(--alpha-safe-bottom))] text-popover-foreground shadow-sheet outline-none motion-safe:animate-rise dark:border-border",
          className,
        )}
        onPointerDownOutside={(event) => {
          if (isInToastRegion(event.target)) event.preventDefault();
          onPointerDownOutside?.(event);
        }}
        onInteractOutside={(event) => {
          if (isInToastRegion(event.target)) event.preventDefault();
          onInteractOutside?.(event);
        }}
        {...props}
      >
        <div className="flex flex-col gap-1">
          <DialogPrimitive.Title className={surfaceTitle}>{title}</DialogPrimitive.Title>
          {description ? <DialogPrimitive.Description className={surfaceDescription}>{description}</DialogPrimitive.Description> : null}
        </div>
        {children ? <div className="-mx-5 min-h-0 flex-1 overflow-y-auto px-5">{children}</div> : null}
        {actions ? <div className="flex gap-2 *:flex-1">{actions}</div> : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
