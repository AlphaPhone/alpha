import type { ComponentMeta } from "vibestack/stories";
import type { WalletQrProps } from "./WalletQr.tsx";

export const meta: ComponentMeta<WalletQrProps> = {
  args: { value: "0x52908400098527886E0F7030069857D2E4169EE7", label: "Ethereum address as a QR code" },
};
