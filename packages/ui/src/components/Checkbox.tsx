import type { ComponentProps } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "../lib/cn.ts";
import { markTarget } from "../lib/styles.ts";

export type CheckboxProps = Omit<ComponentProps<typeof CheckboxPrimitive.Root>, "children"> & {
  /** Marks the choice as refused, visibly and through `aria-invalid`. */
  invalid?: boolean;
};

/** A yes-or-no choice, square where a radio button is round; `checked="indeterminate"` shows a dash for a choice made for some of many. Name it with a `Label` or `aria-label`. */
export function Checkbox({ invalid = false, className, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root aria-invalid={invalid || undefined} className={cn(markTarget, className)} {...props}>
      <span className="relative flex size-6 items-center justify-center text-alpha-foreground">
        <svg aria-hidden viewBox="0 0 24 24" className="absolute inset-0 size-full fill-background stroke-input stroke-2 transition-colors duration-fast ease-standard group-aria-invalid:stroke-destructive group-data-[state=checked]:fill-alpha group-data-[state=checked]:stroke-alpha group-data-[state=indeterminate]:fill-alpha group-data-[state=indeterminate]:stroke-alpha">
          <rect x="1" y="1" width="22" height="22" rx="6" />
        </svg>
        <CheckboxPrimitive.Indicator className="relative flex">
          <Check aria-hidden strokeWidth={3} className="size-4 group-data-[state=indeterminate]:hidden" />
          <Minus aria-hidden strokeWidth={3} className="hidden size-4 group-data-[state=indeterminate]:block" />
        </CheckboxPrimitive.Indicator>
      </span>
    </CheckboxPrimitive.Root>
  );
}
