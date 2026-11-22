import type { ComponentMeta } from "vibestack/stories";
import type { FundsFormProps } from "./FundsForm.tsx";
import { fundsForm } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<FundsFormProps> = {
  args: { billing: fundsForm, onAdd: none, onClose: none },
  examples: { AwaitingPayment: { billing: { ...fundsForm, funds: "FundsAwaitingReturn" } } },
};
