import type { ComponentProps } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn, focusRing } from "../lib/cn.ts";

type Root = ComponentProps<typeof SliderPrimitive.Root>;

export type SliderProps = Pick<Root, "min" | "max" | "step" | "disabled" | "name" | "className" | "ref" | "aria-label" | "aria-labelledby"> & {
  /** The thumb's id, for a `Label` whose `htmlFor` names the slider. */
  id?: string;
  /** The value as a person would say it, such as "40%" or "Large", where the number alone does not. */
  "aria-valuetext"?: string;
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

/** A value picked along a line, such as a volume or a text size. Name it with a `Label` or `aria-label`. */
export function Slider({ value, defaultValue, onValueChange, onValueCommit, id, "aria-label": label, "aria-labelledby": labelledBy, "aria-valuetext": valueText, className, ...props }: SliderProps) {
  return (
    <SliderPrimitive.Root
      value={one(value)}
      defaultValue={one(defaultValue)}
      onValueChange={first(onValueChange)}
      onValueCommit={first(onValueCommit)}
      className={cn("relative flex h-11 w-full touch-none items-center select-none data-disabled:opacity-50", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-input">
        <SliderPrimitive.Range className="absolute h-full bg-alpha" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb id={id} aria-label={label} aria-labelledby={labelledBy} aria-valuetext={valueText} className={cn(focusRing, "block size-6 rounded-full border-2 border-alpha bg-background shadow-sm")} />
    </SliderPrimitive.Root>
  );
}
