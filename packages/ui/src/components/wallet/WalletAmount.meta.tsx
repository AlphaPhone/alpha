import type { ComponentMeta } from "vibestack/stories";
import type { WalletAmountProps } from "./WalletAmount.tsx";

export const meta: ComponentMeta<WalletAmountProps> = {
  args: { amount: "1.5", symbol: "ETH" },
  examples: { Exact: { amount: "0.000000000000000001", symbol: "ETH", size: "lg" } },
};
