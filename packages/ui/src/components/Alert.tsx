import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "../lib/cn.ts";

const alertVariants = cva("flex items-start gap-3 rounded-lg bg-secondary px-4 py-3 text-sm text-secondary-foreground [&>svg]:size-5 [&>svg]:shrink-0", {
  variants: { variant: { info: "[&>svg]:text-info", ok: "[&>svg]:text-ok", warn: "[&>svg]:text-warn", destructive: "[&>svg]:text-destructive" } },
  defaultVariants: { variant: "info" },
});
const icons = { info: Info, ok: CircleCheck, warn: TriangleAlert, destructive: CircleAlert };

export type AlertProps = ComponentProps<"div"> & VariantProps<typeof alertVariants>;

/** A message about what just happened, marked by the color and shape of its icon. `warn` and `destructive` interrupt a screen reader; the others wait their turn. */
export function Alert({ variant, className, children, ...props }: AlertProps) {
  const tone = variant ?? "info";
  const Icon = icons[tone];
  return (
    <div role={tone === "warn" || tone === "destructive" ? "alert" : "status"} className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
