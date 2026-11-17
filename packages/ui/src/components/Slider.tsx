import type { ComponentProps } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn, focusRing } from "../lib/cn.ts";

type Root = ComponentProps<typeof SliderPrimitive.Root>;

export type SliderProps = Pick<Root, "min" | "max" | "step" | "disabled" | "name" | "className" | "aria-label" | "aria-labelledby"> & {
  /** Where the thumb is, from `min` to `max`; leave out for a slider that keeps its own value. */
  value?: number;
  /** Where the thumb starts on a slider that keeps its own value. */
  defaultValue?: number;
  /** Called with each value the thumb passes. */
  onValueChange?: (value: number) => void;
  /** Called with the value the thumb is let go at. */
  onValueCommit?: (value: number) => void;
};

const one = (value: number | undefined) => (value === undefined ? undefined : [value]);
const first = (heard: ((value: number) => void) | undefined) => heard && (([value]: number[]) => { if (value !== undefined) heard(value); });

/** A value picked along a line, such as a volume or a text size. Name it with `aria-label`. */
export function Slider({ value, defaultValue, onValueChange, onValueCommit, "aria-label": label, "aria-labelledby": labelledBy, className, ...props }: SliderProps) {
  return (
    <SliderPrimitive.Root
      value={one(value)}
      defaultValue={one(defaultValue)}
      onValueChange={first(onValueChange)}
      onValueCommit={first(onValueCommit)}
      className={cn("relative flex h-11 w-full touch-none items-center select-none data-disabled:opacity-50", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-accent">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb aria-label={label} aria-labelledby={labelledBy} className={cn(focusRing, "block size-6 rounded-full border-2 border-primary bg-background shadow-sm")} />
    </SliderPrimitive.Root>
  );
}
