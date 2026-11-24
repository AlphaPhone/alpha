import * as TogglePrimitive from "@radix-ui/react-toggle";
import type { ComponentProps } from "react";
import { cn, focusRing } from "../../lib/cn.ts";

export type ToggleProps = ComponentProps<typeof TogglePrimitive.Root>;

/** A pressed or unpressed control, such as mute or speaker. */
export function Toggle({ className, ...props }: ToggleProps) {
  return <TogglePrimitive.Root className={cn(focusRing, "inline-flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground disabled:opacity-50 data-[state=on]:bg-foreground data-[state=on]:text-background", className)} {...props} />;
}
