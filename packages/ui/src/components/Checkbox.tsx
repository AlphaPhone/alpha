import type { ComponentProps } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "../lib/cn.ts";
import { mark, markTarget } from "../lib/styles.ts";

export type CheckboxProps = Omit<ComponentProps<typeof CheckboxPrimitive.Root>, "children"> & {
  /** Marks the choice as refused, visibly and through `aria-invalid`. */
  invalid?: boolean;
};

/** A yes-or-no choice. Name it with a `Label` or `aria-label`. */
export function Checkbox({ invalid = false, className, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root aria-invalid={invalid || undefined} className={cn(markTarget, className)} {...props}>
      <span className={cn(mark, "text-primary-foreground group-aria-invalid:border-destructive group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary")}>
        <CheckboxPrimitive.Indicator>
          <Check aria-hidden strokeWidth={3} className="size-4" />
        </CheckboxPrimitive.Indicator>
      </span>
    </CheckboxPrimitive.Root>
  );
}
