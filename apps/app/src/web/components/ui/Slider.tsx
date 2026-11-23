import * as SliderPrimitive from "@radix-ui/react-slider";
import type { ComponentProps } from "react";
import { cn, focusRing } from "../../lib/cn.ts";

export type SliderProps = ComponentProps<typeof SliderPrimitive.Root> & { "aria-label": string };

/** A value chosen along a track, such as volume or text size. */
export function Slider({ className, "aria-label": label, ...props }: SliderProps) {
  return (
    <SliderPrimitive.Root className={cn("relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50", className)} {...props}>
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb aria-label={label} className={cn(focusRing, "block size-5 rounded-full border-2 border-primary bg-background")} />
    </SliderPrimitive.Root>
  );
}
