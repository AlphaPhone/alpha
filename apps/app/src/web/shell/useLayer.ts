// spec/shell/navigation.md, "A layer is listed once, closes with its owner or with Back, and holds the phone while open"
import { useMachine } from "../../../gen/shell__navigation.react.ts";
import type { LayerKind } from "../../../gen/shell__navigation.ts";
import { runtime } from "../runtime.ts";

/** A sheet, menu or dialog the caller draws, listed in the shell's navigation so Back and HOME close it. */
export function useLayer(id: string, kind: LayerKind = "SheetLayer", covers = true) {
  const { state, can, send } = useMachine(runtime);
  const layers = state?.layers ?? [];
  return {
    /** Listed now. */
    open: layers.some((layer) => layer.id === id),
    /** Topmost now, so Escape and a drag reach it. */
    top: layers.at(-1)?.id === id,
    /** Opens the layer where the navigation allows it now. */
    show: () => { if (can({ type: "openLayer", id, kind, covers })) void send({ type: "openLayer", id, kind, covers }); },
    /** Closes the layer. */
    hide: () => { if (can({ type: "closeLayer", id })) void send({ type: "closeLayer", id }); },
  };
}
