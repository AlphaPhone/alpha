import type { ComponentMeta } from "vibestack/stories";
import type { SignInPanelProps } from "./SignInPanel.tsx";
import { chooser, codeStep, factorStep, googleWait, offlineChooser, retainedFactor, spentCode } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<SignInPanelProps> = {
  args: {
    signIn: chooser, serviceName: "Eliza Cloud", android: true, onRetry: none, onChoose: none, onGoogle: none, onReopenGoogle: none, onDraft: none, onSubmit: none, onVerify: none,
    onResend: none, onBack: none, onOwnKeys: none, onWifiSettings: none,
  },
  examples: { Offline: { signIn: offlineChooser }, Code: { signIn: codeStep }, Spent: { signIn: spentCode }, Factor: { signIn: factorStep }, Google: { signIn: googleWait }, Retained: { signIn: retainedFactor }, Busy: { signIn: { ...codeStep, work: "Verifying", fault: "KeysBusy" } } },
};
