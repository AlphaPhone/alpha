import type { ComponentMeta } from "vibestack/stories";
import type { TrashViewProps } from "./TrashView.tsx";
import { trash } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<TrashViewProps> = {
  args: { trash, now: 1_763_000_000_000, volumeName: (volume) => (volume ? "SD card" : "Internal storage"), onShow: none, onToggle: none, onBeginSelecting: none,
    onSelectAll: none, onEndSelecting: none, onRestore: none, onReviewEmpty: none, onReviewChosen: none },
  examples: { Selecting: { trash: { ...trash, selecting: true, selected: [trash.items[0]!.key] } }, Partial: { trash: { ...trash, listing: "Partial" } },
    Empty: { trash: { ...trash, items: [] } } },
};
