import * as ToastPrimitive from "@radix-ui/react-toast";
import type { ComponentProps, ReactNode } from "react";
import { cn, focusRing } from "../../lib/cn.ts";

export const ToastProvider = ToastPrimitive.Provider;

/** Where toasts appear: under the top inset, above the dock. */
export const ToastViewport = ({ className, ...props }: ComponentProps<typeof ToastPrimitive.Viewport>) => (
  <ToastPrimitive.Viewport className={cn("fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-[60] mx-auto flex w-full max-w-md flex-col gap-2 px-3 outline-none", className)} {...props} />
);

export type ToastProps = ComponentProps<typeof ToastPrimitive.Root> & {
  /** The message; one short sentence. */
  title: ReactNode;
  /** The one action the toast offers, such as Undo. */
  action?: { label: string; onAction: () => void };
};

/** A short notice that leaves by itself; an action it offers is also reachable without it. */
export function Toast({ className, title, action, ...props }: ToastProps) {
  return (
    <ToastPrimitive.Root className={cn("flex min-h-14 items-center gap-3 rounded-lg bg-foreground px-4 text-background shadow-lg", className)} {...props}>
      <ToastPrimitive.Title className="flex-1 text-sm">{title}</ToastPrimitive.Title>
      {action && (
        <ToastPrimitive.Action altText={action.label} onClick={action.onAction} className={cn(focusRing, "font-mono text-xs uppercase tracking-widest text-primary-foreground")}>
          {action.label}
        </ToastPrimitive.Action>
      )}
    </ToastPrimitive.Root>
  );
}
