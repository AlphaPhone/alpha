import { type ComponentProps, createElement } from "react";
import { cn } from "../lib/cn.ts";

export type SkeletonProps =
  | (Omit<ComponentProps<"div">, "children"> & { as?: "div" })
  | (Omit<ComponentProps<"span">, "children"> & { as: "span" });

/** A placeholder in the shape of content still loading; size it with `className`. */
export function Skeleton({ as = "div", className, ...props }: SkeletonProps) {
  return createElement(as, {
    "aria-hidden": true,
    className: cn("h-4 w-full rounded-md bg-linear-to-r from-muted via-accent to-muted bg-size-[200%_100%] motion-safe:animate-shimmer", className),
    ...props,
  });
}
