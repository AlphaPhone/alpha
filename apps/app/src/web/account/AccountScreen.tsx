// spec/account/sheet.md, "Story: Look after my account in one place"; spec/account/session.md, "Story: Keep my sign-in working until I sign out"; spec/account/signIn.md, "Story: Choose how to sign in"; spec/account/provider.md, "Story: Use my own keys instead of Cloud"
import { Effect } from "effect";
import { useMachine as useAgentAccess } from "../../../gen/account__agentAccess.react.ts";
import { initial as accessInitial } from "../../../gen/account__agentAccess.ts";
import { useMachine as useBilling } from "../../../gen/account__billing.react.ts";
import { initial as billingInitial } from "../../../gen/account__billing.ts";
import { useMachine as useDedicated } from "../../../gen/account__dedicated.react.ts";
import { initial as dedicatedInitial } from "../../../gen/account__dedicated.ts";
import { useMachine as useDelegation } from "../../../gen/account__delegation.react.ts";
import { initial as delegationInitial } from "../../../gen/account__delegation.ts";
import { useMachine as useBridge } from "../../../gen/account__devBridge.react.ts";
import { initial as bridgeInitial } from "../../../gen/account__devBridge.ts";
import { useMachine as useGoogle } from "../../../gen/account__google.react.ts";
import { initial as googleInitial } from "../../../gen/account__google.ts";
import { useMachine as usePlan } from "../../../gen/account__plan.react.ts";
import { initial as planInitial } from "../../../gen/account__plan.ts";
import { useMachine as useProvider } from "../../../gen/account__provider.react.ts";
import { initial as providerInitial } from "../../../gen/account__provider.ts";
import { useMachine as useSession } from "../../../gen/account__session.react.ts";
import { initial as sessionInitial, isSignedIn } from "../../../gen/account__session.ts";
import { useMachine as useSheet } from "../../../gen/account__sheet.react.ts";
import { type Section, initial as sheetInitial } from "../../../gen/account__sheet.ts";
import { useMachine as useSignIn } from "../../../gen/account__signIn.react.ts";
import { entryOf, initial as signInInitial } from "../../../gen/account__signIn.ts";
import { GoogleAgentAccess } from "../../account/agentAccess.vibe";
import { Membership } from "../../account/billing.vibe";
import { CloudDelegation } from "../../account/delegation.vibe";
import { authorityOf } from "../../account/deployment.ts";
import { DedicatedSetup, DevBridgeSignIn } from "../../account/devBridge.vibe";
import { Entitlement } from "../../account/entitlement.vibe";
import { GoogleAccounts } from "../../account/google.vibe";
import { AccountPresentation } from "../../account/presentation.vibe";
import { AiProvider } from "../../account/provider.vibe";
import { AccountSheet } from "../../account/sheet.vibe";
import { Navigation } from "../../shell/navigation.vibe";
import { SignInScreen } from "../../account/signIn.vibe";
import type { ScreenProps } from "../app-screen.ts";
import { AccountScreenView } from "./AccountScreenView.tsx";
import { SignInHost } from "./SignInHost.tsx";
import { act, useServiceStream } from "../shell/services.ts";
import { runtime } from "./runtime.ts";

/** What the shell gives the Account screen: the route it opened at and how to leave. */
export type AccountScreenProps = ScreenProps;

const present = (use: (p: AccountPresentation.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(AccountPresentation), use));
const sheetDo = (use: (s: AccountSheet.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(AccountSheet), use));
const membership = (use: (m: Membership.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(Membership), use));
const googleDo = (use: (g: GoogleAccounts.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(GoogleAccounts), use));
const providerDo = (use: (p: AiProvider.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(AiProvider), use));

/**
 * The Account screen: sign-in while signed out, otherwise the account sheet over the account runtime.
 * @model spec/account/sheet.md
 * @design design.md
 */
export function AccountScreen({ onClose }: AccountScreenProps) {
  const { state: session = sessionInitial } = useSession(runtime);
  const { state: sheet = sheetInitial } = useSheet(runtime);
  const { state: signIn = signInInitial } = useSignIn(runtime);
  const { state: billing = billingInitial } = useBilling(runtime);
  const { state: admission = planInitial } = usePlan(runtime);
  const { state: google = googleInitial } = useGoogle(runtime);
  const { state: delegation = delegationInitial } = useDelegation(runtime);
  const { state: access = accessInitial } = useAgentAccess(runtime);
  const { state: provider = providerInitial } = useProvider(runtime);
  const { state: bridge = bridgeInitial } = useBridge(runtime);
  const { state: dedicated = dedicatedInitial } = useDedicated(runtime);
  const summary = useServiceStream("account/plan-summary", Effect.map(Effect.service(Entitlement), (e) => e.summaries), { owner: 0, view: undefined, planEndsAt: null });
  const details = useServiceStream("account/billing-details", Effect.map(Effect.service(Membership), (m) => m.details), { offers: [], referral: undefined, email: undefined, quote: undefined, renewsAt: undefined });
  const rows = useServiceStream("account/google-accounts", Effect.map(Effect.service(GoogleAccounts), (g) => g.accounts), []);
  const delegationDetails = useServiceStream("account/delegation-details", Effect.map(Effect.service(CloudDelegation), (d) => d.details), { grantId: undefined, pendingRevocations: [], email: true, calendar: true });
  const authority = authorityOf(session.deployment, session.environment);
  const ownKeys = signIn.work === "SavingOwnKeys";
  if (!ownKeys && sheet.section !== "ProviderSection" && (!isSignedIn(session.phase) || entryOf(signIn) === "OpenedEntry")) return <SignInHost serviceName={authority.name} onClose={onClose} />;
  return (
    <AccountScreenView
      session={session} sheet={sheet} billing={billing} admission={admission} google={google} access={access} delegation={delegation} provider={provider}
      bridge={bridge} dedicated={dedicated} summary={summary} details={details} accounts={rows} delegationDetails={delegationDetails}
      serviceName={authority.name} ownKeys={ownKeys} onClose={onClose}
      onSection={(target: Section) => present((p) => p.openSection(target))} onBack={() => present((p) => p.back())}
      onSignInAgain={() => act(Effect.flatMap(Effect.service(SignInScreen), (s) => s.open()))}
      onToggleCode={() => sheetDo((s) => s.toggleCode())} onRedeem={(code) => membership((m) => m.redeem(code))}
      onAskSignOut={() => sheetDo((s) => s.askSignOut())} onConfirmSignOut={() => sheetDo((s) => s.confirmSignOut())} onCancelSignOut={() => sheetDo((s) => s.cancelSignOut())}
      onAddFunds={(cents) => membership((m) => m.addFunds(cents))} onLeaveOwnKeys={() => providerDo((p) => p.leave())}
      providerActs={{
        onSave: (textKey, voiceKey) => providerDo((p) => p.save(textKey, voiceKey)), onChoose: (route) => providerDo((p) => p.choose(route)),
        onAskRemove: (key) => providerDo((p) => p.askRemove(key)), onCancelRemove: () => providerDo((p) => p.cancelRemove()),
        onConfirmRemove: () => providerDo((p) => p.confirmRemove()), onReveal: (key) => providerDo((p) => p.reveal(key)),
        onRefresh: () => providerDo((p) => p.refresh()),
      }}
      planActs={{
        onSubscribe: (plan) => membership((m) => m.subscribe(plan)), onChange: (target) => membership((m) => m.change(target)),
        onCancel: () => membership((m) => m.cancel()), onKeep: () => membership((m) => m.keep()), onSendCode: () => membership((m) => m.sendCode()),
        onVerifyCode: (code) => membership((m) => m.verifyCode(code)), onConfirmChange: () => membership((m) => m.confirmChange()),
        onConfirmCancel: () => membership((m) => m.confirmCancel()), onApplyReferral: (code) => membership((m) => m.applyReferral(code)),
        onShareReferral: (code) => void (navigator.share ? navigator.share({ text: code }).catch(() => undefined) : navigator.clipboard?.writeText(code).catch(() => undefined)),
      }}
      googleActs={{
        onConnect: (capabilities) => googleDo((g) => g.connect(capabilities)), onAllowCalendar: () => googleDo((g) => g.allowCalendar()),
        onCancel: () => googleDo((g) => g.cancel()), onDisconnect: () => googleDo((g) => g.disconnect()), onReload: () => googleDo((g) => g.reload()),
        onAccess: (field, value, expected) => act(Effect.flatMap(Effect.service(GoogleAgentAccess), (a) => a.set(field, value, expected))),
      }}
      delegationActs={{
        onStart: (email, calendar) => act(Effect.flatMap(Effect.service(CloudDelegation), (d) => d.start(email, calendar))),
        onCheck: () => act(Effect.flatMap(Effect.service(CloudDelegation), (d) => d.checkStatus())),
        onCancel: () => act(Effect.flatMap(Effect.service(CloudDelegation), (d) => d.cancel())),
        onReviewRemoval: (grantId) => act(Effect.flatMap(Effect.service(Navigation), (n) => n.open("workflows", `google-removal/${encodeURIComponent(grantId)}`))),
        onRetryDisconnect: (grantId) => act(Effect.flatMap(Effect.service(CloudDelegation), (d) => d.retryDisconnect(grantId))),
      }}
      developerActs={{
        onBridgeSignIn: () => act(Effect.flatMap(Effect.service(DevBridgeSignIn), (b) => b.signIn())), onBridgeCancel: () => act(Effect.flatMap(Effect.service(DevBridgeSignIn), (b) => b.cancel())),
        onReview: () => act(Effect.flatMap(Effect.service(DedicatedSetup), (d) => d.review())), onAccept: () => act(Effect.flatMap(Effect.service(DedicatedSetup), (d) => d.accept())),
        onDecline: () => act(Effect.flatMap(Effect.service(DedicatedSetup), (d) => d.decline())), onPoll: () => act(Effect.flatMap(Effect.service(DedicatedSetup), (d) => d.poll())),
        onFinalize: () => act(Effect.flatMap(Effect.service(DedicatedSetup), (d) => d.finalize())),
      }}
    />
  );
}
