import type { ComponentMeta } from "vibestack/stories";
import type { ToastRegionProps } from "./ToastRegion.tsx";
import { undoToast } from "./fixtures.ts";

const noop = () => {};

export const meta: ComponentMeta<ToastRegionProps> = {
  args: { toasts: undoToast, onHold: noop, onRelease: noop, onAction: noop },
  examples: { Failure: { toasts: { ...undoToast, shown: { message: "Couldn't share. Try again.", chars: 26, undo: "", failure: true } } } },
};
