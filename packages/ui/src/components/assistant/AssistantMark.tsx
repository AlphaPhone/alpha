import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";
import { Mark } from "../Mark.tsx";

export type AssistantMarkProps = Omit<ComponentProps<"span">, "children">;

/**
 * Alpha's mark filling its blue circle, the rays running off the rim, sized by the caller: 44px on the bar and the pill,
 * 34px in the sheet's header, 18px beside Alpha's messages.
 */
export function AssistantMark({ className, ...props }: AssistantMarkProps) {
  return (
    <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-alpha text-alpha-foreground", className)} {...props}>
      <Mark aria-hidden className="size-[118%] shrink-0" />
    </span>
  );
}
