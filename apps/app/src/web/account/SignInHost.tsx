// spec/account/signIn.md, "Story: Choose how to sign in"; spec/account/signIn.md, "Story: Leave sign-in"
import { Effect, Stream } from "effect";
import { useMachine as useSignIn } from "../../../gen/account__signIn.react.ts";
import { entryOf, initial as signInInitial } from "../../../gen/account__signIn.ts";
import { SignInScreen } from "../../account/signIn.vibe";
import { SignInPanel } from "./SignInPanel.tsx";
import { act, runtime, useAccountStream } from "./runtime.ts";

/** What the sign-in host needs beyond the account runtime: the deployment's name and where its exits lead. */
export interface SignInHostProps {
  /** The deployment's display name, such as "Eliza Cloud". */
  serviceName: string;
  /** Leave the dialog the owner opened; the required page has none. */
  onClose?: () => void;
  /** Open the owner-provided keys form instead of Cloud sign-in. */
  onOwnKeys?: () => void;
}

const screen = (use: (s: SignInScreen.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(SignInScreen), use));

/**
 * The sign-in screen over the account runtime.
 * @model spec/account/signIn.md
 */
export function SignInHost({ serviceName, onClose, onOwnKeys }: SignInHostProps) {
  const { state: signIn = signInInitial } = useSignIn(runtime);
  const terms = useAccountStream("account/service-info", Effect.map(Effect.service(SignInScreen), (s) => Stream.fromEffect(s.serviceInfo())), undefined);
  const leave = () => {
    const entry = entryOf(signIn);
    screen((s) => s.back());
    if (entry === "OpenedEntry" && signIn.screen === "Choose" && signIn.work === "NoWork") onClose?.();
  };
  return (
    <SignInPanel
      signIn={signIn} serviceName={serviceName} terms={terms} android={signIn.host === "AndroidHost"}
      onRetry={() => screen((s) => s.open())} onChoose={(method) => screen((s) => s.choose(method))} onGoogle={() => screen((s) => s.google())}
      onSubmit={(address) => screen((s) => s.submit(address))} onVerify={(code) => screen((s) => s.verify(code))}
      onResend={(address) => screen((s) => s.resend(address))} onBack={leave}
      onOwnKeys={() => { screen((s) => s.ownKeys(true, false)); onOwnKeys?.(); }}
      onWifiSettings={() => screen((s) => s.openWifiSettings())}
    />
  );
}
