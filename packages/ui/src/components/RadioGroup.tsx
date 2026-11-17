import type { ComponentProps } from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "../lib/cn.ts";
import { mark, markTarget } from "../lib/styles.ts";

export type RadioGroupProps = ComponentProps<typeof RadioGroupPrimitive.Root>;
export type RadioGroupItemProps = Omit<ComponentProps<typeof RadioGroupPrimitive.Item>, "children">;

/** One choice out of a few, all in view: holds a `RadioGroupItem` for each. Name it with `aria-label`. */
export function RadioGroup({ className, ...props }: RadioGroupProps) {
  return <RadioGroupPrimitive.Root className={cn("flex flex-col", className)} {...props} />;
}

/** One choice of a `RadioGroup`. Name it with a `Label` or `aria-label`. */
export function RadioGroupItem({ className, ...props }: RadioGroupItemProps) {
  return (
    <RadioGroupPrimitive.Item className={cn(markTarget, className)} {...props}>
      <span className={cn(mark, "group-data-[state=checked]:border-primary")}>
        <RadioGroupPrimitive.Indicator className="size-3 rounded-full bg-primary" />
      </span>
    </RadioGroupPrimitive.Item>
  );
}
