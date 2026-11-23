import type { ComponentMeta } from "vibestack/stories";
import { folders } from "./fixtures.ts";
import type { FoldersSheetProps } from "./FoldersSheet.tsx";

const noop = () => undefined;

export const meta: ComponentMeta<FoldersSheetProps> = {
  args: { open: true, folders, onOpenChange: noop, onSelect: noop, onCreate: noop, onRename: noop, onDelete: noop },
  examples: {
    Selected: { selected: "f-work" },
    Empty: { folders: [] },
    Full: { folders: Array.from({ length: 100 }, (_, at) => ({ id: `f-${at}`, name: `Folder ${at + 1}`, createdAt: at })) },
  },
};
