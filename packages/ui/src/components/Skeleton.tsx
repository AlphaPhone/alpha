import type { ComponentProps } from "react";
import { cn } from "../lib/cn.ts";

export type SkeletonProps = Omit<ComponentProps<"div">, "children">;

/** A placeholder in the shape of content still loading; size it with `className`. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div aria-hidden className={cn("h-4 w-full rounded-md bg-linear-to-r from-muted via-accent to-muted bg-size-[200%_100%] motion-safe:animate-shimmer", className)} {...props} />;
}
