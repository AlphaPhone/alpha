import type { ReactNode } from "react";
import { cn, focusRing } from "../../lib/cn.ts";

type BrowserMenuRow = {
  /** What the row does, as it reads. */
  label: string;
  /** Its accessible name where it says more than the label. */
  name?: string;
  /** The row's icon, before its words; decorative. */
  icon: ReactNode;
};

export type BrowserMenuItem = BrowserMenuRow & (
  | { onSelect: () => void; disabled?: boolean; reason?: never }
  | { reason: string; onSelect?: never; disabled?: never }
);

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
      <button type="button" tabIndex={-1} aria-label="Close menu" onClick={onClose} className="absolute inset-x-0 top-0 bottom-[max(--spacing(27),calc(var(--alpha-dock-clearance,--spacing(25.5))+--spacing(1.5)))] z-20 bg-transparent" />
      <div role="dialog" aria-label="Browser menu"
        className="absolute top-24.5 right-2.5 bottom-[max(--spacing(27),calc(var(--alpha-dock-clearance,--spacing(25.5))+--spacing(1.5)))] z-20 flex w-59 max-w-[calc(100%-1.25rem)] animate-drop flex-col overflow-y-auto rounded-panel bg-card p-1.5 shadow-panel ring-1 ring-border dark:shadow-panel-dark">
        {items.map((item) => item.reason !== undefined ? (
          <p key={item.name ?? item.label} role="note" aria-label={item.name ?? item.label} className="m-0 flex shrink-0 items-center gap-3.5 px-3.5 pt-1.5 pb-3 text-caption leading-[1.4] text-muted-foreground">
            <span aria-hidden className="relative flex shrink-0 [&_svg]:size-5">
              {item.icon}<span className="absolute -top-0.5 left-1/2 h-6 w-0.5 -translate-x-1/2 -rotate-45 rounded-full bg-current" />
            </span>
            <span className="sr-only">{item.reason}</span>
            <span aria-hidden className="line-through">{item.label}</span>
          </p>
        ) : (
          <button key={item.name ?? item.label} type="button" aria-label={item.name ?? item.label} disabled={item.disabled} onClick={item.onSelect}
            className={cn(focusRing, "flex min-h-12.5 shrink-0 items-center gap-3.5 rounded-action px-3.5 text-left text-base active:bg-accent disabled:opacity-45 [&_svg]:size-5 [&_svg]:shrink-0")}>
            {item.icon}{item.label}
          </button>
        ))}
      </div>
    </>
  );
}
