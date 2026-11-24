import type { ComponentMeta } from "vibestack/stories";
import type { TrashItemSheetProps } from "./TrashItemSheet.tsx";
import { trash } from "./fixtures.ts";

const none = () => undefined;
const shown = { ...trash, opened: trash.items[1]!.key };

export const meta: ComponentMeta<TrashItemSheetProps> = {
  args: { trash: shown, volumeName: (volume) => (volume ? "SD card" : "Internal storage"), onRestore: none, onDelete: none, onConfirmDelete: none, onClose: none },
  examples: { Asking: { trash: { ...shown, confirm: "DeleteOne", confirming: [trash.items[1]!.key] } }, Busy: { busy: true } },
};
