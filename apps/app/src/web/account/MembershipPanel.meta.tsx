import type { ComponentMeta } from "vibestack/stories";
import { initial as planInitial } from "../../../gen/account__plan.ts";
import type { MembershipPanelProps } from "./MembershipPanel.tsx";
import { managerOnPlus, openSheet } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<MembershipPanelProps> = {
  args: {
    email: "owner@example.com", summary: { owner: 1, view: undefined, planEndsAt: null }, admission: planInitial, billing: managerOnPlus, sheet: openSheet,
    onManagePlan: none, onAddFunds: none, onToggleCode: none, onRedeem: none,
  },
  examples: { CodeEntry: { sheet: { ...openSheet, codeEntry: true } }, PlanNeeded: { admission: { ...planInitial, credential: 1, notice: "NeedsPlanNotice", binding: "Unbound" } } },
};
