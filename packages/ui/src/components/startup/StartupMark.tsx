import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";
import { Mark } from "../Mark.tsx";

export type StartupMarkProps = Omit<ComponentProps<"div">, "children">;

/**
 * The Alpha mark alone on the page, which holds Home still until the connection to the agent has resolved.
 * @model spec/app/startup/index.md
 */
export function StartupMark({ className, ...props }: StartupMarkProps) {
  return (
    <div role="status" aria-label="Loading Alpha" className={cn("flex size-full flex-1 items-center justify-center bg-background text-alpha motion-safe:animate-fade", className)} {...props}>
      <Mark className="size-14" />
    </div>
  );
}
