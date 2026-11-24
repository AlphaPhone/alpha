import type { ComponentMeta } from "vibestack/stories";
import type { EraseDialogProps } from "./EraseDialog.tsx";
import { trash } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<EraseDialogProps> = {
  args: { trash: { ...trash, confirm: "EmptyAll", confirming: trash.items.map((item) => item.key) }, onConfirm: none, onCancel: none },
  examples: { Chosen: { trash: { ...trash, selecting: true, selected: [trash.items[1]!.key], confirm: "DeleteChosen", confirming: [trash.items[1]!.key] } },
    Busy: { busy: true } },
};
