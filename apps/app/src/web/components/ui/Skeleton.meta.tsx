import type { ComponentMeta } from "vibestack/stories";
import type { SkeletonProps } from "./Skeleton.tsx";

export const meta: ComponentMeta<SkeletonProps> = {
  args: { className: "h-4 w-48" },
  examples: {
    Avatar: { className: "size-10 rounded-full" },
    Row: { className: "h-14 w-full" },
    Card: { className: "h-32 w-full rounded-lg" },
  },
};
