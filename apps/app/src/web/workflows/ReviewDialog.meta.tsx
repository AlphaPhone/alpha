import type { ComponentMeta } from "vibestack/stories";
import type { ReviewDialogProps } from "./ReviewDialog.tsx";

export const meta: ComponentMeta<ReviewDialogProps> = {
  args: { open: true, title: "Run Morning now?", confirm: "Confirm", onConfirm: () => undefined, onCancel: () => undefined },
  examples: {
    Destructive: { title: "Delete Plan my day?", confirm: "Delete", destructive: true },
    Disabled: { title: "Edit schedule", confirm: "Save", disabled: true },
  },
};
