import type { ComponentMeta } from "vibestack/stories";
import type { SignInHostProps } from "./SignInHost.tsx";

const none = () => undefined;

export const meta: ComponentMeta<SignInHostProps> = {
  args: { serviceName: "Eliza Cloud", onClose: none, onOwnKeys: none },
  examples: {
    Required: { onClose: undefined },
    AlphaCloud: { serviceName: "Alpha Cloud" },
  },
};
