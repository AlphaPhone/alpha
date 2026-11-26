// spec/app/shell/layers.md, "Story: Keep a sheet or a dialog above the phone"
import { type LayerEntry, LayerObserverProvider, PortalContainerProvider } from "@repo/ui";
import { type ReactNode, useCallback, useRef } from "react";
import type { Alpha } from "../runtime/area.tsx";

export interface ShellLayerHostProps {
  /** The running shell instance receiving layer registrations and Back handoffs. */
  alpha: Alpha;
  /** The DOM element hosting portals inside the shell frame. */
  portalContainer: HTMLElement | null;
  children: ReactNode;
}

/**
 * Contract C2 bridge: connects `@repo/ui`'s `PortalContainerProvider` and `LayerObserverProvider`
 * to shell Back routing (`ui-layer`) without duplicating explicit `Layers.Machine` registrations.
 */
export function ShellLayerHost({ alpha, portalContainer, children }: ShellLayerHostProps) {
  const stackRef = useRef<Array<{ readonly id: string; readonly dismiss: () => void }>>([]);
  const onLayerChange = useCallback((entry: LayerEntry) => {
    stackRef.current = stackRef.current.filter((item) => item.id !== entry.id);
    if (entry.open) {
      stackRef.current.push({ id: entry.id, dismiss: entry.dismiss });
    }
    alpha.taking("ui-layer", () => {
      const top = stackRef.current.at(-1);
      if (!top) return Promise.resolve(false);
      top.dismiss();
      return Promise.resolve(true);
    });
  }, [alpha]);

  return (
    <PortalContainerProvider container={portalContainer}>
      <LayerObserverProvider onLayerChange={onLayerChange}>
        {children}
      </LayerObserverProvider>
    </PortalContainerProvider>
  );
}
