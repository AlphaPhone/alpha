import type { ComponentProps } from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "../lib/cn.ts";
import { markTarget, radioMark } from "../lib/styles.ts";

export type RadioGroupProps = ComponentProps<typeof RadioGroupPrimitive.Root>;
export type RadioGroupItemProps = Omit<ComponentProps<typeof RadioGroupPrimitive.Item>, "children">;

/**
 * One choice out of a few, all in view: holds a `RadioGroupItem` for each. Name it with `aria-label`. A disabled group
 * refuses a click on itself as its disabled choices do, since Radix leaves the group's own element clickable.
 */
export function RadioGroup({ className, onClick, ...props }: RadioGroupProps) {
  return <RadioGroupPrimitive.Root className={cn("flex flex-col", className)} onClick={props.disabled ? undefined : onClick} {...props} />;
}

/** One choice of a `RadioGroup`. Name it with a `Label` or `aria-label`. */
export function RadioGroupItem({ className, ...props }: RadioGroupItemProps) {
  return (
    <RadioGroupPrimitive.Item className={cn(markTarget, className)} {...props}>
      <span className={radioMark}>
        <RadioGroupPrimitive.Indicator className="size-3 rounded-full bg-primary" />
      </span>
    </RadioGroupPrimitive.Item>
  );
}
