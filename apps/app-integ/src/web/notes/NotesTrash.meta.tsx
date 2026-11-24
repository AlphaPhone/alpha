import type { ComponentMeta } from "vibestack/stories";
import { trashConfirm, trashOpen, trashRestoreOnly, trashRows } from "./fixtures.ts";
import type { NotesTrashProps } from "./NotesTrash.tsx";

const noop = () => undefined;

export const meta: ComponentMeta<NotesTrashProps> = {
  args: { view: trashOpen, rows: trashRows, canAsk: true, canRestore: true, canAskErase: true, canErase: true,
    onClose: noop, onAsk: noop, onCloseAsk: noop, onRestore: noop, onAskErase: noop, onCancelErase: noop, onErase: noop },
  examples: { RestoreOnly: { view: trashRestoreOnly }, Confirm: { view: trashConfirm, asked: trashRows[0] } },
};
