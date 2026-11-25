import type { ComponentProps, MouseEvent } from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, focusRing } from "../lib/cn.ts";
import { Spinner } from "./Spinner.tsx";

const buttonVariants = cva(
  [
    focusRing,
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-base font-semibold whitespace-nowrap transition-colors duration-fast ease-standard disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5.5",
  ],
  {
    variants: {
      variant: {
        primary: "bg-alpha text-alpha-foreground hover:bg-alpha/90 active:bg-alpha/80",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent active:bg-accent",
        outline: "border border-input bg-background text-foreground hover:bg-accent active:bg-accent",
        ghost: "text-foreground hover:bg-accent active:bg-accent",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80",
      },
      size: {
        sm: "relative h-9 min-w-9 px-4 text-sm before:absolute before:-inset-1 [&_svg:not([class*='size-'])]:size-4.5",
        md: "h-12 min-w-12 px-5",
        lg: "h-13 min-w-13 px-6 text-lg",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Shows a spinner and refuses presses while work is in flight; focus stays on the button. The parent says how it ended. */
    loading?: boolean;
    /** Renders the single child element with the button's styles, for a link that looks like a button. */
    asChild?: boolean;
  };

const refuse = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

/** An action a person can take: 48px tall, 36px at `sm` with a 44px target. Give one without text, such as an icon, an `aria-label`. */
export function Button({ variant, size, loading = false, asChild = false, disabled, className, children, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  const refused = { "aria-disabled": true, onClickCapture: refuse };
  const state = asChild ? (disabled || loading) && { ...refused, tabIndex: -1 } : { disabled, ...(loading && !disabled && refused) };
  return (
    <Comp type={asChild ? undefined : "button"} aria-busy={loading || undefined} className={cn(buttonVariants({ variant, size }), className)} {...props} {...state}>
      {loading && <Spinner size="sm" aria-hidden />}
      <Slottable>{children}</Slottable>
    </Comp>
  );
}
