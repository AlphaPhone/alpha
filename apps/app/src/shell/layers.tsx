// spec/app/shell/layers.md, "Story: Keep a sheet or a dialog above the phone"
import * as UI from "@repo/ui";
import { type ComponentType, type ReactNode, useCallback, useRef } from "react";
import type { Alpha } from "../runtime/area.tsx";
import { closeLayer, openLayer } from "./shell.vibe";

interface LayerObservation {
  readonly id: string;
  readonly kind: "SheetLayer" | "DialogLayer" | "MenuLayer";
  readonly open: boolean;
  readonly dismiss: () => void;
}

type PortalProvider = ComponentType<{ container: HTMLElement | null; children: ReactNode }>;
type LayerProvider = ComponentType<{ onLayerChange?: (entry: LayerObservation) => void; children: ReactNode }>;

const uiExports = UI as Record<string, unknown>;
const PortalContainerProvider = typeof uiExports.PortalContainerProvider === "function"
  ? (uiExports.PortalContainerProvider as PortalProvider)
  : undefined;
const LayerObserverProvider = typeof uiExports.LayerObserverProvider === "function"
  ? (uiExports.LayerObserverProvider as LayerProvider)
  : undefined;

export interface ShellLayerHostProps {
  /** The running shell instance receiving layer registrations and Back handoffs. */
  alpha: Alpha;
  /** The DOM element hosting portals when `@repo/ui` exposes `PortalContainerProvider`. */
  portalContainer: HTMLElement | null;
  children: ReactNode;
}

/**
 * Contract C2 bridge: connects `@repo/ui`'s optional `PortalContainerProvider` and `LayerObserverProvider`
 * to `Layers.Machine` and shell Back routing without requiring Wave 1 cross-package edits.
 */
export function ShellLayerHost({ alpha, portalContainer, children }: ShellLayerHostProps) {
  const dismissersRef = useRef(new Map<string, () => void>());
  const onLayerChange = useCallback((entry: LayerObservation) => {
    if (entry.open) {
      dismissersRef.current.set(entry.id, entry.dismiss);
      alpha.taking(`layer:${entry.id}`, () => {
        const dismiss = dismissersRef.current.get(entry.id);
        if (!dismiss) return Promise.resolve(false);
        dismiss();
        return Promise.resolve(true);
      });
      void alpha.runtime.runPromiseExit(openLayer(entry.id, entry.kind, entry.kind !== "MenuLayer"));
    } else {
      dismissersRef.current.delete(entry.id);
      alpha.taking(`layer:${entry.id}`, () => Promise.resolve(false));
      void alpha.runtime.runPromiseExit(closeLayer(entry.id));
    }
  }, [alpha]);

  let wrapped = children;
  if (LayerObserverProvider) {
    wrapped = <LayerObserverProvider onLayerChange={onLayerChange}>{wrapped}</LayerObserverProvider>;
  }
  if (PortalContainerProvider) {
    wrapped = <PortalContainerProvider container={portalContainer}>{wrapped}</PortalContainerProvider>;
  }
  return <>{wrapped}</>;
}
