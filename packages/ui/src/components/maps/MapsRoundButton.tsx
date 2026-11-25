import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, focusRing } from "../../lib/cn.ts";

const round = cva(
  [focusRing, "inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-fast ease-standard disabled:pointer-events-none disabled:opacity-35 aria-disabled:opacity-35 [&_svg:not([class*='size-'])]:size-5.5"],
  {
    variants: {
      tone: {
        float: "bg-background text-foreground shadow-md ring-1 ring-border active:bg-accent",
        fill: "bg-secondary text-foreground active:bg-accent",
        plain: "text-foreground active:bg-accent",
        // eslint-disable-next-line better-tailwindcss/no-unknown-classes -- Guidance stays dark in both themes, as on develop; `dark` is the design system's theme class.
        night: "dark bg-secondary text-secondary-foreground shadow-lg",
        // eslint-disable-next-line better-tailwindcss/no-unknown-classes -- As above.
        nightFill: "dark bg-accent text-accent-foreground",
      },
      size: { sm: "size-11", md: "size-12.5", lg: "size-13", xl: "size-13.5", "2xl": "size-14" },
    },
    defaultVariants: { tone: "fill", size: "lg" },
  },
);

export type MapsRoundButtonProps = ComponentProps<"button"> & VariantProps<typeof round> & {
  /** What the button does, since it shows only an icon. */
  "aria-label": string;
};

/** A round button over the map or on a sheet that shows only an icon: Recenter, Save, Share, Close and the like. */
export function MapsRoundButton({ tone, size, className, ...props }: MapsRoundButtonProps) {
  return <button type="button" className={cn(round({ tone, size }), className)} {...props} />;
}
