import type { ReactNode } from "react";
import { cn, focusRing } from "../../lib/cn.ts";

export type BrowserMenuItem = {
  /** What the row does, as it reads. */
  label: string;
  /** Its accessible name where it says more than the label. */
  name?: string;
  /** The row's icon, before its words; decorative. */
  icon: ReactNode;
  onSelect: () => void;
};

export type BrowserMenuProps = {
  /** The rows the Browser offers now, in order. */
  items: BrowserMenuItem[];
  /** Closes the menu: a press beside it. */
  onClose: () => void;
};

/** The Browser's menu, dropped below its bar at the right: what can be done with the tab and its page. */
export function BrowserMenu({ items, onClose }: BrowserMenuProps) {
  return (
    <>
      <button type="button" tabIndex={-1} aria-label="Close menu" onClick={onClose} className="absolute inset-0 z-20 bg-transparent" />
      <div role="dialog" aria-label="Browser menu"
        className="absolute top-24.5 right-2.5 z-20 flex max-h-[calc(100%-7.5rem)] w-59 max-w-[calc(100%-1.25rem)] animate-drop flex-col overflow-y-auto rounded-panel bg-card p-1.5 shadow-menu ring-1 ring-border">
        {items.map((item) => (
          <button key={item.label} type="button" aria-label={item.name ?? item.label} onClick={item.onSelect}
            className={cn(focusRing, "flex min-h-12.5 items-center gap-3.5 rounded-lg px-3.5 text-left text-base active:bg-accent [&_svg]:size-5 [&_svg]:shrink-0")}>
            {item.icon}{item.label}
          </button>
        ))}
      </div>
    </>
  );
}
