import type { ComponentProps } from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn, focusRing } from "../lib/cn.ts";

export type SwitchProps = Omit<ComponentProps<typeof SwitchPrimitive.Root>, "children">;

/** Something that is on or off, and changes as soon as it is pressed. Name it with a `Label` or `aria-label`. */
export function Switch({ className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root className={cn(focusRing, "group peer inline-flex size-13 shrink-0 items-center rounded-full disabled:cursor-not-allowed disabled:opacity-50", className)} {...props}>
      <span className="flex h-8 w-13 items-center rounded-full bg-accent px-0.75 transition-colors duration-base ease-standard group-data-[state=checked]:bg-alpha">
        <SwitchPrimitive.Thumb className="size-6.5 rounded-full bg-alpha-foreground shadow-sm transition-transform duration-base ease-standard data-[state=checked]:translate-x-5" />
      </span>
    </SwitchPrimitive.Root>
  );
}
