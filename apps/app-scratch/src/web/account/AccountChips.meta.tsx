import type { ComponentMeta } from "vibestack/stories";
import type { AccountChipsProps } from "./AccountChips.tsx";
import { quietChips } from "./AccountChips.tsx";

export const meta: ComponentMeta<AccountChipsProps> = {
  args: { chips: { ...quietChips, ai: "AiCheckingChip" } },
  examples: {
    NoPlan: { chips: { ...quietChips, ai: "NoPlanChip" } },
    AiOff: { chips: { ...quietChips, ai: "AiOffChip", agentDown: true } },
    CheckSignIn: { chips: { ...quietChips, checkSignIn: true } },
    NewAccount: { chips: { ...quietChips, created: true, email: "owner@example.com" } },
    Quiet: { chips: quietChips },
  },
};
