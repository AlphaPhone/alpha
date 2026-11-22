import type { ComponentMeta } from "vibestack/stories";
import type { FilePickerSheetProps } from "./FilePickerSheet.tsx";
import { picker } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<FilePickerSheetProps> = {
  args: { picker, deviceLabel: "Browse", onBrowse: none, onReview: none, onUnchoose: none, onDevice: none, onAttach: none, onDismiss: none },
  examples: { Changed: { picker: { ...picker, error: "FileChanged" } }, Empty: { picker: { ...picker, rows: [], selected: [] } } },
};
