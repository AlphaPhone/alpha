import type { ComponentMeta } from "vibestack/stories";
import type { StartupPermissionsProps } from "./StartupPermissions.tsx";
import { cameraStep } from "./fixtures.ts";

const noop = () => {};

export const meta: ComponentMeta<StartupPermissionsProps> = {
  args: { walkthrough: cameraStep, onAllow: noop, onNext: noop, onFinish: noop, onClose: noop },
  examples: { Ready: { walkthrough: { ...cameraStep, phase: "PhaseReady", progress: -1, completed: true } } },
};
