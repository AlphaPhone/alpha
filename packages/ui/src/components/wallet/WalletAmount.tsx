import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn.ts";

const figureVariants = cva("font-display font-light break-all tabular-nums", {
  variants: { size: { md: "text-2xl", lg: "text-4xl" } },
  defaultVariants: { size: "md" },
});

export type WalletAmountProps = Omit<ComponentProps<"span">, "children"> &
  VariantProps<typeof figureVariants> & {
    /** The amount in the asset's own units, as exact digits: shown as written, never rounded. */
    amount: string;
    /** The asset's symbol, quieter, after the figure. */
    symbol: string;
  };

/** An amount of one asset: the figure large, its symbol beside it. A long figure wraps rather than being cut. */
export function WalletAmount({ amount, symbol, size, className, ...props }: WalletAmountProps) {
  return (
    <span className={cn("inline-flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-foreground", className)} {...props}>
      <span className={figureVariants({ size })}>{amount}</span>
      <span className="text-sm text-muted-foreground">{symbol}</span>
    </span>
  );
}
