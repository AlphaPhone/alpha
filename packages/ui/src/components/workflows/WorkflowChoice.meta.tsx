import type { ComponentMeta } from "vibestack/stories";
import type { WorkflowChoiceProps } from "./WorkflowChoice.tsx";

export const meta: ComponentMeta<WorkflowChoiceProps> = {
  args: { label: "Automation", icon: null },
  examples: { unavailable: { label: "Steps", description: "Your agent can’t save workflows yet.", icon: null, disabled: true } },
};
