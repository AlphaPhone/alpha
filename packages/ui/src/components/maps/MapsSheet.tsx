import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

export type MapsSheetProps = ComponentProps<"section"> & {
  /** How tall the sheet stands from the foot of the screen: pixels, or a CSS length such as `calc(100% - 104px)`. */
  height: number | string;
};

/** The sheet that rises over the foot of the map: the search, a place or its directions. */
export function MapsSheet({ height, className, style, ...props }: MapsSheetProps) {
  return (
    <section
      style={{ ...style, height }}
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-sheet border-t border-border bg-background text-foreground shadow-sheet transition-[height] duration-slow ease-standard motion-safe:animate-rise",
        className,
      )}
      {...props}
    />
  );
}
