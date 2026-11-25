import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, focusRing } from "../../lib/cn.ts";

const pill = cva(
  [focusRing, "inline-flex min-w-0 items-center justify-center gap-2.5 rounded-full font-semibold whitespace-nowrap transition-colors duration-fast ease-standard disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0"],
  {
    variants: {
      tone: { accent: "bg-alpha text-alpha-foreground active:bg-alpha/85", fill: "bg-secondary text-foreground active:bg-accent" },
      size: { sm: "h-10 px-2 text-meta [&_svg]:size-4.5", md: "h-11 px-4 text-sm", lg: "h-13 px-4 text-body", xl: "h-14 px-4 text-lg" },
    },
    defaultVariants: { tone: "accent", size: "lg" },
  },
);

export type MapsPillButtonProps = ComponentProps<"button"> & VariantProps<typeof pill>;

/** A wide round-ended button of Maps: Directions and Start in Alpha blue, and a travel mode or a route to choose. */
export function MapsPillButton({ tone, size, className, ...props }: MapsPillButtonProps) {
  return <button type="button" className={cn(pill({ tone, size }), className)} {...props} />;
}
