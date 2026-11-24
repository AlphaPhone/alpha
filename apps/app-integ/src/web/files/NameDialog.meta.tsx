import type { ComponentMeta } from "vibestack/stories";
import type { NameDialogProps } from "./NameDialog.tsx";

const none = () => undefined;

export const meta: ComponentMeta<NameDialogProps> = {
  args: { op: "create", initial: "", onConfirm: none, onCancel: none },
  examples: { Rename: { op: "rename", initial: "lease.pdf", keepExtension: true }, Taken: { op: "rename", initial: "lease.pdf", keepExtension: true, error: "That name is already used here." } },
};
