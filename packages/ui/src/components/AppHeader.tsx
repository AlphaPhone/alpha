import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/cn.ts";

export type AppHeaderProps = Omit<ComponentProps<"header">, "title"> & {
  /** The screen's one title. */
  title: string;
  /** The control that leaves the screen, usually a back `Button`; shown before the title. */
  leading?: ReactNode;
  /** The screen's own actions, at the end. */
  children?: ReactNode;
};

/** The top of a screen: where the owner is, the way back and what can be done here. */
export function AppHeader({ title, leading, className, children, ...props }: AppHeaderProps) {
  return (
    <header className={cn("flex min-h-14 items-center gap-1 px-2", className)} {...props}>
      {leading}
      <h1 className={cn("min-w-0 flex-1 truncate font-display text-3xl font-light", leading ? null : "pl-3")}>{title}</h1>
      {children}
    </header>
  );
}
