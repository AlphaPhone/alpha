import type { ComponentProps } from "react";
import { cn } from "../lib/cn.ts";
import { textField } from "../lib/styles.ts";

export type InputProps = Omit<ComponentProps<"input">, "children"> & {
  /** Marks the value as refused, visibly and through `aria-invalid`. */
  invalid?: boolean;
};

/** A single-line text field. Name it with a `Label` or `aria-label`. */
export function Input({ invalid = false, className, ...props }: InputProps) {
  return <input aria-invalid={invalid || undefined} className={cn(textField, "h-12", className)} {...props} />;
}
