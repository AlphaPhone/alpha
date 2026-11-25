import { createContext, type ReactNode, type Ref, use, useCallback, useId } from "react";

/** The kind of floating layer registered with the host shell. */
export type LayerKind = "SheetLayer" | "DialogLayer" | "MenuLayer";

/** An open or closing floating layer reported to `LayerObserverProvider`. */
export interface LayerEntry {
  id: string;
  kind: LayerKind;
  open: boolean;
  dismiss: () => void;
}

/** Receives open and close notifications for floating layers. */
export type LayerObserver = (entry: LayerEntry) => void;

export interface PortalContainerProviderProps {
  /** DOM element portals mount into instead of `document.body`. */
  container?: HTMLElement | null;
  children: ReactNode;
}

export interface LayerObserverProviderProps {
  /** Called whenever a Dialog, Sheet, Menu, Select, or drawer mounts or unmounts. */
  onLayerChange?: LayerObserver;
  children: ReactNode;
}

const PortalContainerContext = createContext<HTMLElement | undefined>(undefined);
const LayerObserverContext = createContext<LayerObserver | undefined>(undefined);

/** Provides the portal mount target for floating `@repo/ui` surfaces. */
export function PortalContainerProvider({ container, children }: PortalContainerProviderProps) {
  return <PortalContainerContext value={container ?? undefined}>{children}</PortalContainerContext>;
}

/** Returns the portal mount target supplied by `PortalContainerProvider`, if any. */
export function usePortalContainer(): HTMLElement | undefined {
  return use(PortalContainerContext);
}

/** Observes open and close transitions of floating `@repo/ui` layers. */
export function LayerObserverProvider({ onLayerChange, children }: LayerObserverProviderProps) {
  return <LayerObserverContext value={onLayerChange}>{children}</LayerObserverContext>;
}

/** Returns true when an event target lies inside a `ToastRegion`. */
export function isInToastRegion(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("[data-alpha-toast-region]") !== null;
}

/** Assigns a DOM node to a forwarded React ref and returns any cleanup callback. */
function assignRef<T>(ref: Ref<T> | undefined, node: T | null): (() => void) | undefined {
  if (!ref) return undefined;
  if (typeof ref === "function") {
    const cleanup = ref(node);
    return typeof cleanup === "function" ? cleanup : undefined;
  }
  ref.current = node;
  return () => { ref.current = null; };
}

/** Registers a mounted layer element with `LayerObserverProvider` and merges an optional forwarded ref. */
export function useLayerRef<T extends HTMLElement>(kind: LayerKind, forwarded?: Ref<T>): (node: T | null) => (() => void) | undefined {
  const id = useId();
  const onLayerChange = use(LayerObserverContext);
  return useCallback((node: T | null) => {
    const cleanForwarded = assignRef(forwarded, node);
    if (!node || !onLayerChange) return cleanForwarded;
    const dismiss = () => {
      const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
      node.dispatchEvent(event);
    };
    onLayerChange({ id, kind, open: true, dismiss });
    return () => {
      onLayerChange({ id, kind, open: false, dismiss });
      cleanForwarded?.();
    };
  }, [forwarded, id, kind, onLayerChange]);
}
