import { type ReactNode, useCallback } from "react";
import { cn, focusRing } from "../../lib/cn.ts";
import { useLayerRef } from "../../lib/layers.tsx";

export type BrowserMenuItem = {
  /** What the row does, as it reads. */
  label: string;
  /** Its accessible name where it says more than the label. */
  name?: string;
  /** The row's icon, before its words; decorative. */
  icon: ReactNode;
  disabled?: boolean;
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
  const layerRef = useLayerRef("MenuLayer");
  const panelRef = useCallback((node: HTMLDivElement | null) => {
    const cleanup = layerRef(node);
    if (node && !node.contains(node.ownerDocument.activeElement)) {
      node.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    }
    return cleanup;
  }, [layerRef]);
  return (
    <>
      <button type="button" tabIndex={-1} aria-label="Close menu" onClick={onClose} className="absolute inset-0 z-dialog bg-transparent" />
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Browser menu"
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }}
        className="absolute top-14 right-2.5 z-dialog flex max-h-[calc(100%-7.5rem)] w-59 max-w-[calc(100%-1.25rem)] flex-col overflow-y-auto rounded-panel border border-border/60 bg-popover p-1.5 text-popover-foreground shadow-menu motion-safe:animate-drop in-data-[alpha-launcher]:top-24.5 dark:border-border"
      >
        {items.map((item) => (
          <button key={item.label} type="button" aria-label={item.name ?? item.label} disabled={item.disabled} onClick={item.onSelect}
            className={cn(focusRing, "flex min-h-12.5 items-center gap-3.5 rounded-lg px-3.5 text-left text-base transition-colors duration-fast ease-standard motion-reduce:transition-none active:bg-accent disabled:opacity-45 [&_svg]:size-5 [&_svg]:shrink-0")}>
            <span aria-hidden className="flex shrink-0">{item.icon}</span>{item.label}
          </button>
        ))}
      </div>
    </>
  );
}
