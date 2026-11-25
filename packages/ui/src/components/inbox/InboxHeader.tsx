import type { ComponentProps, ReactNode } from "react";
import { cn, focusRing } from "../../lib/cn.ts";

export type InboxHeaderProps = Omit<ComponentProps<"header">, "title"> & {
  /** The screen's title, cut short on one line; left out where the screen puts its own heading or none among the controls. */
  title?: string;
  /** The way back, before the title. */
  leading?: ReactNode;
  /** The screen's own actions, at the end. */
  children?: ReactNode;
};

/** A 52px round control of an Inbox header: an icon with its accessible name. */
export const inboxHeaderButton = cn(focusRing, "flex size-13 shrink-0 items-center justify-center rounded-full -outline-offset-2 active:bg-accent disabled:opacity-50 [&_svg]:size-5");

/** The rows of a header's menu: 44px, icon and words 12px apart. */
export const inboxMenu = "min-w-50 rounded-lg border-0 p-1 [&_[role=menuitem]]:min-h-11 [&_[role=menuitem]]:gap-3 [&_[role=menuitem]]:rounded-none [&_[role=menuitem]]:px-3.5 [&_[role=menuitem]]:py-0";

/**
 * The top of an Inbox screen: the way back, the title in one line and the screen's actions, 52px tall.
 *
 * @model spec/app/inbox/index.md
 */
export function InboxHeader({ title, leading, className, children, ...props }: InboxHeaderProps) {
  return (
    <header data-host-chrome="" className={cn("flex h-13 shrink-0 items-center gap-0.5 px-2 [&>button:first-child]:size-13", className)} {...props}>
      {leading}
      {title === undefined ? null : <h1 className={cn("min-w-0 flex-1 truncate text-xl leading-tight font-semibold", leading ? null : "pl-3")}>{title}</h1>}
      {children}
    </header>
  );
}
