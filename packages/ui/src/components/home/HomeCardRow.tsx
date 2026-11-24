import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

export type HomeCardRowProps = ComponentProps<"section">;

/** The daily overview above Home's tiles: the cards that are drawn, in order, in a row that scrolls sideways. */
export function HomeCardRow({ className, ...props }: HomeCardRowProps) {
  return <section aria-label="Your day" className={cn("flex shrink-0 touch-pan-x snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 [scrollbar-width:none] not-has-[button]:hidden after:w-3 after:shrink-0", className)} {...props} />;
}
