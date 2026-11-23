import type { ComponentMeta } from "vibestack/stories";
import type { WorkflowsScreenProps } from "./WorkflowsScreen.tsx";

const none = () => undefined;

export const meta: ComponentMeta<WorkflowsScreenProps> = {
  args: { onClose: none },
};
