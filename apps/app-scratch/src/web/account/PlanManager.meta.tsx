import type { ComponentMeta } from "vibestack/stories";
import type { PlanManagerProps } from "./PlanManager.tsx";
import { codeForChange, details, managerNoPlan, managerOnPlus, quotedUpgrade } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<PlanManagerProps> = {
  args: {
    billing: managerNoPlan, details, onSubscribe: none, onChange: none, onCancel: none, onKeep: none, onSendCode: none, onVerifyCode: none,
    onConfirmChange: none, onConfirmCancel: none, onApplyReferral: none, onShareReferral: none, onClose: none,
  },
  examples: { OnPlus: { billing: managerOnPlus }, Quoted: { billing: quotedUpgrade }, ConfirmItsYou: { billing: codeForChange } },
};
