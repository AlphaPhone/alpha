import type { ComponentMeta } from "vibestack/stories";
import type { DraftSheetProps } from "./DraftSheet.tsx";
import { draftKept, draftReviewed, draftStorageFailed } from "./fixtures.ts";

const none = () => undefined;
const can = { edit: true, save: true, resend: false, recover: false, discard: true };

export const meta: ComponentMeta<DraftSheetProps> = {
  args: { open: true, authoring: draftReviewed, can, onOpenChange: none, onDescribe: none, onSave: none, onRecover: none, onResend: none, onDiscard: none },
  examples: {
    Refused: { described: { kind: "refused", message: "Alpha can’t make calls from a workflow." } },
    KeptUnreceipted: { authoring: draftKept, can: { ...can, edit: false, save: false, recover: true }, outcome: "unknown" },
    StorageFailed: { authoring: draftStorageFailed, can: { ...can, edit: false, save: false } },
  },
};
