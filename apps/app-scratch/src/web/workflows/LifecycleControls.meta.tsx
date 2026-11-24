import type { ComponentMeta } from "vibestack/stories";
import type { LifecycleControlsProps } from "./LifecycleControls.tsx";
import { lifecycleKept, lifecycleOpen, lifecycleRemoved } from "./fixtures.ts";

const none = () => undefined;
const can = { remove: true, restore: false, rename: true, reviewResend: false, back: false };

export const meta: ComponentMeta<LifecycleControlsProps> = {
  args: { lifecycle: lifecycleOpen, name: "Morning", can, onReview: none, onConfirm: none, onReviewResend: none, onResend: none, onBack: none },
  examples: {
    RunGoing: { lifecycle: { ...lifecycleOpen, ongoing: true }, can: { ...can, remove: false } },
    Removed: { lifecycle: lifecycleRemoved, can: { ...can, remove: false, rename: false, restore: true } },
    KeptUnknown: { lifecycle: lifecycleKept, can: { ...can, remove: false, rename: false, reviewResend: true }, outcome: "unknown" },
  },
};
