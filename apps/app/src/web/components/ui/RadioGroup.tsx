import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import type { ComponentProps } from "react";
import { cn, focusRing } from "../../lib/cn.ts";

export type RadioGroupProps = ComponentProps<typeof RadioGroupPrimitive.Root>;

/** A disabled group refuses a click on itself as its disabled choices do: Radix leaves the group's own element clickable. */
export function RadioGroup({ className, onClick, ...props }: RadioGroupProps) {
  return <RadioGroupPrimitive.Root className={cn("grid gap-2", className)} onClick={props.disabled ? undefined : onClick} {...props} />;
}

export type RadioGroupItemProps = ComponentProps<typeof RadioGroupPrimitive.Item>;

/** One choice of a group; exactly one is chosen at a time. */
export function RadioGroupItem({ className, ...props }: RadioGroupItemProps) {
  return (
    <RadioGroupPrimitive.Item className={cn(focusRing, "aspect-square size-5 rounded-full border border-input disabled:opacity-50 data-[state=checked]:border-primary", className)} {...props}>
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center after:block after:size-2.5 after:rounded-full after:bg-primary" />
    </RadioGroupPrimitive.Item>
  );
}
