import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";
import { LogoMark } from "../Mark.tsx";

export type StartupMarkProps = Omit<ComponentProps<"div">, "children">;

/**
 * The Alpha mark alone on a white page, which holds Home still until the connection to the agent has resolved: v119's
 * startup cover (apps/app/src/prototype/phone.css:319), the thin black mark at 56 points that waits 0.3 s, then fades
 * in over 0.7 s. It is drawn light whatever look the owner keeps, as v119's page was always white (phone.css:1).
 * @model spec/app/startup/index.md
 */
export function StartupMark({ className, ...props }: StartupMarkProps) {
  return (
    <div
      role="status"
      aria-label="Loading Alpha"
      // eslint-disable-next-line better-tailwindcss/no-unknown-classes -- The startup cover is always light; `light` is the design system's theme class.
      className={cn("light flex size-full flex-1 items-center justify-center bg-background text-foreground", className)}
      {...props}
    >
      <LogoMark role="img" aria-label="Alpha" aria-hidden={undefined} className="size-14 motion-safe:animate-startup" />
    </div>
  );
}
