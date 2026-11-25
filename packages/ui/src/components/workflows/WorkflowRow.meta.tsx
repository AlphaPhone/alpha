import type { ComponentMeta } from "vibestack/stories";
import type { WorkflowRowProps } from "./WorkflowRow.tsx";

export const meta: ComponentMeta<WorkflowRowProps> = {
  args: { title: "Desk check", summary: "Next Nov 25, 2026, 4:00 AM", status: "Active" },
  decorator: (story) => <ul aria-label="Workflows">{story()}</ul>,
  examples: { failed: { title: "Receipts to Files", summary: "Failed · PDF was password-protected", failed: true } },
};
