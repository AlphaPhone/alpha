import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.ts";
import { AppHeader, type AppHeaderProps } from "./AppHeader.tsx";

export type ScreenProps = Omit<ComponentProps<"div">, "title"> &
  Pick<AppHeaderProps, "title" | "leading"> & {
    /** The screen's own actions, at the end of its header. */
    actions?: ReactNode;
    /** What the screen shows, in a column that scrolls under the header. */
    children?: ReactNode;
  };

/** The frame of a screen: its header, a body that scrolls, and room at the foot for the Ask Alpha bar. */
export function Screen({ title, leading, actions, className, children, ...props }: ScreenProps) {
  return (
    <div className={cn("flex h-dvh flex-col bg-background pt-[env(safe-area-inset-top)] text-base text-foreground motion-safe:animate-fade", className)} {...props}>
      <AppHeader title={title} leading={leading} className="mx-auto w-full max-w-(--breakpoint-md) shrink-0">{actions}</AppHeader>
      <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(--spacing(26)+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex w-full max-w-(--breakpoint-md) flex-col gap-4 px-4 pt-2">{children}</div>
      </div>
    </div>
  );
}
