import type { ComponentProps, ReactNode } from "react";
import { cn, focusRing } from "../lib/cn.ts";
import { AppHeader, type AppHeaderProps } from "./AppHeader.tsx";

export type ScreenProps = Omit<ComponentProps<"div">, "title"> &
  Pick<AppHeaderProps, "title" | "leading" | "titleControl"> & {
    /** The screen's own actions, at the end of its header. */
    actions?: ReactNode;
    /** What the screen shows, in the `main` region that scrolls under the header. */
    children?: ReactNode;
  };

/**
 * The frame of a screen: its header, a `main` region that scrolls and takes keyboard focus, and room at the foot for
 * the Ask Alpha bar. It fills its parent, so the app shell sizes it: the viewport on a phone, one pane of a
 * list-and-detail layout on a wide screen, where the shell gives only one of them the `main`.
 */
export function Screen({ title, leading, titleControl, actions, className, children, ...props }: ScreenProps) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-background pt-[env(safe-area-inset-top)] text-base text-foreground motion-safe:animate-fade", className)} {...props}>
      <AppHeader title={title} leading={leading} titleControl={titleControl} className="mx-auto w-full max-w-(--breakpoint-md) shrink-0">{actions}</AppHeader>
      <main aria-label={title} tabIndex={0} className={cn(focusRing, "min-h-0 flex-1 overflow-y-auto pb-[calc(--spacing(26)+env(safe-area-inset-bottom))] focus-visible:-outline-offset-focus")}>
        <div className="mx-auto flex w-full max-w-(--breakpoint-md) flex-col gap-4 px-4 pt-2">{children}</div>
      </main>
    </div>
  );
}
