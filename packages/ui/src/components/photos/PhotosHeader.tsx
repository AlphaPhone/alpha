import type { ReactNode } from "react";
import { cn } from "../../lib/cn.ts";

export type PhotosHeaderProps = {
  /** The screen's one title: Photos, Albums, the album open or how many items are selected. */
  title: string;
  /** The control that leaves the screen or the selection, in a 52px square before the title. */
  leading?: ReactNode;
  /** An album or a selection, whose title sits a step further from the control before it. */
  detail?: boolean;
  /** What follows the title: a count, the menu, Select all. */
  children?: ReactNode;
};

/** The 52px top of Photos: the way back, the title and the screen's own controls. */
export function PhotosHeader({ title, leading, detail = false, children }: PhotosHeaderProps) {
  return (
    <header data-host-chrome="" className="flex h-13 shrink-0 items-center gap-0.5 px-2">
      {leading ? <span className="flex size-13 shrink-0 items-center justify-center">{leading}</span> : null}
      <h1 className={cn("min-w-0 flex-1 truncate text-xl font-semibold", detail && "ml-1")}>{title}</h1>
      {children}
    </header>
  );
}
