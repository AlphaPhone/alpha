import type { ComponentProps, ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../lib/cn.ts";
import { useLayerSurface } from "../lib/layers.tsx";
import { aboveDock, sheetHandle, sheetPanel, surfaceDescription, surfaceTitle } from "../lib/styles.ts";
import { Button } from "./Button.tsx";
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
  /** A local sheet's mounted frame and backdrop. */
  frame?: { readonly container: HTMLElement; readonly backdrop: ReactNode };
  /** The dimmed backdrop where the sheet has its own surface treatment. */
  overlayClassName?: string;
  /** Names a close button beside the title; leave out where the sheet's own actions close it. */
  closeLabel?: string;
};

/** A task that rises from the foot of the screen: holds a `SheetTrigger` and a `SheetContent`. */
export function Sheet(props: SheetProps) {
  return <DialogPrimitive.Root {...props} />;
}

/** Opens the sheet; pass `asChild` to use a `Button`. */
export const SheetTrigger = DialogPrimitive.Trigger;

/** Closes the sheet; pass `asChild` to use a `Button`. */
export const SheetClose = DialogPrimitive.Close;

/** The panel at the foot of a dimmed page, under a grab handle: its title, a body that scrolls, and its actions. Escape and a press outside dismiss it. */
export function SheetContent({ title, description, actions, container, overlayClassName, closeLabel, frame, className, children, ref, onPointerDownOutside, onInteractOutside, ...props }: SheetContentProps) {
  const placed = /(?:^|\s)(?:inset-0|inset-y-|bottom-)/.test(className ?? "");
  const surface = useLayerSurface("SheetLayer", { container: frame?.container ?? container, ref, onPointerDownOutside, onInteractOutside });
  return (
    <DialogPrimitive.Portal container={surface.container}>
      {frame ? frame.backdrop : <DialogOverlay className={cn("z-sheet", !placed && aboveDock, overlayClassName)} />}
      <DialogPrimitive.Content
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          sheetPanel,
          !placed && aboveDock,
          sheetHandle,
          "gap-3 border-t border-border/60 bg-popover px-5 pt-8.5 pb-[max(--spacing(9.5),var(--alpha-safe-bottom))] text-popover-foreground shadow-lift dark:border-border dark:shadow-lift-dark",
          className,
        )}
        {...surface.contentProps}
        {...props}
      >
        <div className="flex items-start gap-2">
          <DialogPrimitive.Title className={cn(surfaceTitle, "min-w-0 flex-1 pt-1.5")}>{title}</DialogPrimitive.Title>
          {closeLabel ? (
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label={closeLabel} className="-mt-0.5 -mr-2 rounded-tile [&_svg:not([class*='size-'])]:size-5">
                <X aria-hidden />
              </Button>
            </DialogPrimitive.Close>
          ) : null}
        </div>
        {description ? <DialogPrimitive.Description className={surfaceDescription}>{description}</DialogPrimitive.Description> : null}
        {children ? <div className="-mx-5 -my-1 min-h-0 flex-1 overflow-y-auto px-5 py-1">{children}</div> : null}
        {actions ? <div className="mt-2 flex gap-2.5 *:h-13.5 *:flex-1 *:text-md">{actions}</div> : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
