import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

export type HomeCardRowProps = ComponentProps<"section">;

/** The daily overview above Home's tiles: the cards that are drawn, in order, in a row that scrolls sideways. */
export function HomeCardRow({ className, ...props }: HomeCardRowProps) {
  return <section aria-label="Your day" className={cn("flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1", className)} {...props} />;
}
