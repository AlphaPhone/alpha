import type { ComponentMeta } from "vibestack/stories";
import type { FilesCardProps } from "./FilesCard.tsx";

export const meta: ComponentMeta<FilesCardProps> = {
  args: { open: true, onOpenChange: () => {}, title: "Empty Trash?", message: "1 item will be deleted permanently.", cancelLabel: "Cancel", confirmLabel: "Empty", onConfirm: () => {} },
};
