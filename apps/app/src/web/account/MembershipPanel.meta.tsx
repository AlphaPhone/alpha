import type { ComponentMeta } from "vibestack/stories";
import { initial as planInitial } from "../../../gen/account__plan.ts";
import type { MembershipPanelProps } from "./MembershipPanel.tsx";
import { boundPlan, managerOnPlus, openSheet, ownKeysSaved, providerCloud, unconfirmedRemoval } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<MembershipPanelProps> = {
  args: {
    email: "owner@example.com", summary: { owner: 1, view: undefined, planEndsAt: null }, admission: boundPlan, billing: managerOnPlus, sheet: openSheet,
    provider: providerCloud, serviceName: "Eliza Cloud", onManagePlan: none, onAddFunds: none, onToggleCode: none, onRedeem: none,
  },
  examples: {
    CodeEntry: { sheet: { ...openSheet, codeEntry: true } },
    PlanNeeded: { admission: { ...planInitial, credential: 1, notice: "NeedsPlanNotice", binding: "Unbound", host: "HostRemoved" } },
    RemovalUnconfirmed: { admission: unconfirmedRemoval },
    OwnKeys: { provider: ownKeysSaved },
  },
};
