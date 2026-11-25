import { Share2, Trash2 } from "lucide-react";
import type { ComponentMeta } from "vibestack/stories";
import type { FilesSelectionBarProps } from "./FilesSelectionBar.tsx";

export const meta: ComponentMeta<FilesSelectionBarProps> = {
  args: { actions: [{ label: "Share", icon: <Share2 />, onPress: () => {} }, { label: "Delete", icon: <Trash2 />, onPress: () => {} }] },
};
