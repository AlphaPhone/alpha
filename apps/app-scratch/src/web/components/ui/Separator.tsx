import * as SeparatorPrimitive from "@radix-ui/react-separator";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

export type SeparatorProps = ComponentProps<typeof SeparatorPrimitive.Root>;

export function Separator({ className, orientation = "horizontal", ...props }: SeparatorProps) {
  return <SeparatorPrimitive.Root orientation={orientation} className={cn("shrink-0 bg-border", orientation === "horizontal" ? "h-px w-full" : "h-full w-px", className)} {...props} />;
}
