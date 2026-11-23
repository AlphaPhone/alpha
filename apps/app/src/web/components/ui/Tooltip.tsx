import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export type TooltipContentProps = ComponentProps<typeof TooltipPrimitive.Content>;

export function TooltipContent({ className, sideOffset = 4, ...props }: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content sideOffset={sideOffset} className={cn("z-50 rounded-sm bg-foreground px-2 py-1 font-mono text-xs uppercase text-background", className)} {...props} />
    </TooltipPrimitive.Portal>
  );
}
