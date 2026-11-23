import type { ComponentMeta } from "vibestack/stories";
import type { SelectionBarProps } from "./SelectionBar.tsx";

const none = () => undefined;

export const meta: ComponentMeta<SelectionBarProps> = {
  args: { count: 2, onCancel: none, onSelectAll: none, onShare: none, onMove: none, onCopy: none, onRename: none, onDetails: none, onTrash: none },
  examples: { One: { count: 1 }, Nothing: { count: 0 }, Busy: { busy: true }, Browser: { onDownload: none } },
  bounds: { count: [0, 100] },
};
