import type { ComponentProps } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../lib/cn.ts";
import { dialogPanel, overlay, surfaceDescription, surfaceTitle } from "../lib/styles.ts";
import { Button } from "./Button.tsx";

export type DialogProps = ComponentProps<typeof DialogPrimitive.Root>;
export type DialogTriggerProps = ComponentProps<typeof DialogPrimitive.Trigger>;
export type DialogCloseProps = ComponentProps<typeof DialogPrimitive.Close>;
export type DialogOverlayProps = ComponentProps<typeof DialogPrimitive.Overlay>;
export type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  /** Names a close button in the corner; leave out where the dialog's own actions close it. */
  closeLabel?: string;
  /** An enclosing screen when the dialog covers that screen instead of the viewport. */
  container?: HTMLElement;
  /** Places the overlay inside the same screen when the dialog is local. */
  overlayClassName?: string;
};
export type DialogTitleProps = ComponentProps<typeof DialogPrimitive.Title>;
export type DialogDescriptionProps = ComponentProps<typeof DialogPrimitive.Description>;

/** A modal task: holds a `DialogTrigger` and a `DialogContent`. */
export function Dialog(props: DialogProps) {
  return <DialogPrimitive.Root {...props} />;
}

/** Opens the dialog; pass `asChild` to use a `Button`. */
export const DialogTrigger = DialogPrimitive.Trigger;

/** Closes the dialog; pass `asChild` to use a `Button`. */
export const DialogClose = DialogPrimitive.Close;

/** The dimmed page behind a dialog or a sheet; a press on it dismisses. */
export function DialogOverlay({ className, ...props }: DialogOverlayProps) {
  return <DialogPrimitive.Overlay className={cn(overlay, "z-dialog", className)} {...props} />;
}

/** The panel in the middle of a dimmed page. Needs a `DialogTitle`; without a `DialogDescription`, pass `aria-describedby={undefined}`. Escape and a press outside dismiss it. */
export function DialogContent({ closeLabel, container, overlayClassName, className, children, ...props }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal container={container}>
      <DialogOverlay className={overlayClassName} />
      <DialogPrimitive.Content
        className={cn(dialogPanel, closeLabel && "[&>h2]:pr-8", className)}
        {...props}
      >
        {children}
        {closeLabel ? (
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon" aria-label={closeLabel} className="absolute top-1.5 right-1.5 text-muted-foreground">
              <X />
            </Button>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** The dialog's heading and accessible name. */
export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return <DialogPrimitive.Title className={cn(surfaceTitle, className)} {...props} />;
}

/** What the dialog asks or says, under its title, and its accessible description. */
export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return <DialogPrimitive.Description className={cn(surfaceDescription, "-mt-2", className)} {...props} />;
}
