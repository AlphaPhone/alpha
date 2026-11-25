import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.ts";

export type AppHeaderProps = Omit<ComponentProps<"header">, "title"> & {
  /** The screen's one title; under large text it wraps rather than being cut. */
  title: string;
  /** The control that leaves the screen, usually a back `Button`; shown before the title. */
  leading?: ReactNode;
  /** An inline control that takes the place of the visible title, such as a search field. */
  titleControl?: ReactNode;
  /** The screen's own actions, at the end. */
  children?: ReactNode;
};

/** The top of a screen: where the owner is, the way back and what can be done here. Its icon buttons are 52px. */
export function AppHeader({ title, leading, titleControl, className, children, ...props }: AppHeaderProps) {
  return (
    <header data-host-chrome="" className={cn("flex min-h-13 items-center gap-0.5 px-2 [&_button[aria-label]]:size-13 [&_button[aria-label]]:min-w-13", className)} {...props}>
      {leading}
      <h1 className={titleControl ? "sr-only" : "min-w-0 flex-1 text-xl font-semibold break-words focus-visible:outline-none"}>{title}</h1>
      {titleControl}
      {children}
    </header>
  );
}
