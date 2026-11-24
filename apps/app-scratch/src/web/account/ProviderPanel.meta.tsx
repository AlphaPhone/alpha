import type { ComponentMeta } from "vibestack/stories";
import type { ProviderPanelProps } from "./ProviderPanel.tsx";
import { ownKeysSaved, providerCloud, providerReadFailed, reviewingVoiceRemoval } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<ProviderPanelProps> = {
  args: {
    provider: providerCloud, serviceName: "Eliza Cloud", onSave: none, onChoose: none, onAskRemove: none, onCancelRemove: none,
    onConfirmRemove: none, onReveal: none, onRefresh: none,
  },
  examples: {
    OwnKeys: { provider: ownKeysSaved },
    ReviewingRemoval: { provider: reviewingVoiceRemoval },
    ReadFailed: { provider: providerReadFailed },
    FromSignIn: { provider: providerCloud, onBack: none },
  },
};
