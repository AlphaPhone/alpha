import type { ComponentMeta } from "vibestack/stories";
import { AccountChips, quietChips } from "../account/AccountChips.tsx";
import type { StartupPermissionsProps } from "./StartupPermissions.tsx";
import { cameraStep, grantedSteps, reviewedStep, stalledStep, stillOffStep } from "./fixtures.ts";

const noop = () => {};

export const meta: ComponentMeta<StartupPermissionsProps> = {
  args: { walkthrough: cameraStep, onAllow: noop, onNext: noop, onFinish: noop, onClose: noop },
  examples: {
    Ready: { walkthrough: { ...cameraStep, phase: "PhaseReady", progress: -1, completed: true } },
    NewAccount: {
      walkthrough: { ...cameraStep, phase: "PhaseReady", progress: -1, completed: true },
      account: <AccountChips chips={{ ...quietChips, ai: "NoPlanChip", created: true, email: "owner@example.com" }} />,
    },
    NotSaved: { walkthrough: { ...cameraStep, phase: "PhaseReady", progress: -1, completed: true, progressError: true } },
    Stalled: { walkthrough: stalledStep },
    Review: { walkthrough: reviewedStep },
    Granted: { walkthrough: grantedSteps },
    StillOff: { walkthrough: stillOffStep },
  },
};
