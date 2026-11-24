// spec/settings/updates.md, "Story: Let Android finish an update without losing what I typed"
import type { ComponentMeta } from "vibestack/stories";
import { initial as updates } from "../../../gen/settings__updates.ts";
import { pausedActivation } from "./fixtures.ts";
import type { UpdateActivationProps } from "./UpdateActivation.tsx";

export const meta: ComponentMeta<UpdateActivationProps> = {
  args: { updates: pausedActivation, onContinue: () => undefined },
  states: { Preparing: { updates: { ...updates, activation: "Preparing", pending: true } }, Idle: { updates } },
};
