import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

export type MapsSheetProps = ComponentProps<"section"> & {
  /** How tall the sheet stands from the foot of the screen: pixels, or a CSS length such as `calc(100% - 104px)`. */
  height: number | string;
  /** Whether `height` is the least the sheet stands, growing with what it holds up to under the search field and scrolling past it. */
  grows?: boolean;
};

/** The highest a sheet stands: under the search field. */
const highest = "calc(100% - 104px)";

/** The sheet that rises over the foot of the map: the search, a place or its directions. */
export function MapsSheet({ height, grows = false, className, style, ...props }: MapsSheetProps) {
  const size = typeof height === "number" ? `${height}px` : height;
  return (
    <section
      style={{ ...style, ...(grows ? { minHeight: `min(${size}, ${highest})` } : { height }), maxHeight: highest }}
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-sheet bg-background text-foreground shadow-sheet outline outline-border transition-[height] duration-slow ease-standard motion-safe:animate-rise dark:shadow-sheet-dark",
        grows && "overflow-y-auto overscroll-contain pb-29",
        className,
      )}
      {...props}
    />
  );
}
