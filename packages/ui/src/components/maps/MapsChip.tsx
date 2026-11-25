import type { ComponentProps, ReactNode } from "react";
import { cn, focusRing } from "../../lib/cn.ts";

export type MapsChipProps = Omit<ComponentProps<"button">, "children"> & {
  /** What the chip opens or searches for. */
  label: string;
  /** Its icon, before the label; decorative. */
  icon: ReactNode;
  /** `float` stands over the map with a shadow; `fill` sits on a sheet. */
  tone?: "float" | "fill";
};

/** A saved place over the map, or a kind of place to search for on the search sheet. */
export function MapsChip({ label, icon, tone = "float", className, ...props }: MapsChipProps) {
  return (
    <button
      type="button"
      className={cn(
        focusRing,
        "flex h-10 shrink-0 items-center gap-2 rounded-full pr-4 pl-3 text-sm leading-snug font-semibold whitespace-nowrap active:bg-accent [&_svg]:size-4.5",
        tone === "float" ? "bg-background shadow-md ring-1 ring-border" : "bg-secondary",
        className,
      )}
      {...props}
    >
      <span aria-hidden className="flex">{icon}</span>
      {label}
    </button>
  );
}
