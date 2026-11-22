// spec/account/sheet.md, "Story: Look after my account in one place"; spec/account/session.md, "Story: Keep my sign-in working until I sign out"; spec/account/signIn.md, "Story: Choose how to sign in"
import { Effect } from "effect";
import { ArrowLeft, Bot, CalendarClock, Clock, CreditCard, LogOut, Mail, Smartphone } from "lucide-react";
import { useState } from "react";
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
import { useMachine as useSession } from "../../../gen/account__session.react.ts";
import { initial as sessionInitial, isSignedIn, keyExpiringSoon } from "../../../gen/account__session.ts";
import { useMachine as useSheet } from "../../../gen/account__sheet.react.ts";
import { useMachine as useSignIn } from "../../../gen/account__signIn.react.ts";
import { entryOf, initial as signInInitial } from "../../../gen/account__signIn.ts";
import { SignInScreen } from "../../account/signIn.vibe";
import { type Section, canAskSignOut, canConfirmSignOut, canOpenSection, canSwitchMode, initial as sheetInitial } from "../../../gen/account__sheet.ts";
import { GoogleAgentAccess } from "../../account/agentAccess.vibe";
import { Membership } from "../../account/billing.vibe";
import { CloudDelegation } from "../../account/delegation.vibe";
import { DedicatedSetup, DevBridgeSignIn } from "../../account/devBridge.vibe";
import { Entitlement } from "../../account/entitlement.vibe";
import { GoogleAccounts } from "../../account/google.vibe";
import { CloudSession } from "../../account/session.vibe";
import { AccountSheet } from "../../account/sheet.vibe";
import { authorityOf, deployment, environmentFor } from "../../account/deployment.ts";
import type { ScreenProps } from "../app-screen.ts";
import { Button, ListRow } from "../components/ui/index.ts";
import { DelegationPanel } from "./DelegationPanel.tsx";
import { DeveloperPanel } from "./DeveloperPanel.tsx";
import { FundsForm } from "./FundsForm.tsx";
import { GooglePanel } from "./GooglePanel.tsx";
import { MembershipPanel } from "./MembershipPanel.tsx";
import { PlanManager } from "./PlanManager.tsx";
import { SignInHost } from "./SignInHost.tsx";
import { accountRuntime, act, useAccountStream } from "./runtime.ts";

const routes: Record<string, Section> = { plans: "PlansSection", funds: "FundsSection", google: "GoogleSection", delegation: "DelegationSection", provider: "ProviderSection" };
const day = (at: number) => new Date(at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

/**
 * The Account screen: sign-in while signed out, otherwise membership, plan, Google, hosted results and the AI provider,
 * with sign-out reviewed for the account it names.
 * @model spec/account/sheet.md
 * @design design.md
 */
export function AccountScreen({ route, onClose }: ScreenProps) {
  const { state: session = sessionInitial } = useSession(accountRuntime);
  const { state: sheet = sheetInitial } = useSheet(accountRuntime);
  const { state: signIn = signInInitial } = useSignIn(accountRuntime);
  const { state: billing = billingInitial } = useBilling(accountRuntime);
  const { state: admission = planInitial } = usePlan(accountRuntime);
  const { state: google = googleInitial } = useGoogle(accountRuntime);
  const { state: delegation = delegationInitial } = useDelegation(accountRuntime);
  const { state: access = accessInitial } = useAgentAccess(accountRuntime);
  const { state: bridge = bridgeInitial } = useBridge(accountRuntime);
  const { state: dedicated = dedicatedInitial } = useDedicated(accountRuntime);
  const summary = useAccountStream("account/plan-summary", Effect.map(Effect.service(Entitlement), (e) => e.summaries), { owner: 0, view: undefined, planEndsAt: null });
  const details = useAccountStream("account/billing-details", Effect.map(Effect.service(Membership), (m) => m.details), { offers: [], referral: undefined, email: undefined, quote: undefined, renewsAt: undefined });
  const rows = useAccountStream("account/google-accounts", Effect.map(Effect.service(GoogleAccounts), (g) => g.accounts), []);
  const delegationDetails = useAccountStream("account/delegation-details", Effect.map(Effect.service(CloudDelegation), (d) => d.details), { grantId: undefined, pendingRevocations: [], email: true, calendar: true });
  const [now] = useState(() => {
    act(Effect.flatMap(Effect.service(AccountSheet), (s) => Effect.andThen(s.show(), routes[route ?? ""] ? s.openSection(routes[route ?? ""]) : Effect.void)));
    act(Effect.flatMap(Effect.service(CloudSession), (c) => Effect.flatMap(c.current(), (s) => isSignedIn(s.phase) && route !== "sign-in" ? Effect.void : Effect.flatMap(Effect.service(SignInScreen), (x) => x.open()))));
    return Date.now();
  });
  const authority = authorityOf(deployment, environmentFor(session.testMocks));
  const sheetDo = (use: (s: AccountSheet.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(AccountSheet), use));
  const close = () => {
    sheetDo((s) => s.close());
    onClose();
  };
  const section = (target: Section) => {
    if (target === "PlansSection") act(Effect.flatMap(Effect.service(Membership), (m) => m.openManager()));
    if (target === "FundsSection") act(Effect.flatMap(Effect.service(Membership), (m) => m.openFunds()));
    if (target === "GoogleSection") act(Effect.flatMap(Effect.service(GoogleAccounts), (g) => g.open("SettingsPanel")));
    sheetDo((s) => s.openSection(target));
  };
  const back = () => {
    if (sheet.section === "PlansSection") act(Effect.flatMap(Effect.service(Membership), (m) => m.closeManager()));
    if (sheet.section === "FundsSection") act(Effect.flatMap(Effect.service(Membership), (m) => m.closeFunds()));
    if (sheet.section === "GoogleSection") act(Effect.flatMap(Effect.service(GoogleAccounts), (g) => g.close()));
    sheetDo((s) => s.back());
  };
  const membership = (use: (m: Membership.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(Membership), use));
  const googleDo = (use: (g: GoogleAccounts.Shape) => Effect.Effect<unknown>) => act(Effect.flatMap(Effect.service(GoogleAccounts), use));
  if (!isSignedIn(session.phase) || entryOf(signIn) === "OpenedEntry") return <SignInHost serviceName={authority.name} onClose={close} />;
  const expiring = sheet.expiryShown || keyExpiringSoon(session.account, now);
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-2">
        {sheet.section !== "AccountSection" && <Button variant="ghost" size="icon" aria-label="Back" onClick={back}><ArrowLeft aria-hidden /></Button>}
        <h1 className="font-serif text-3xl">Account</h1>
      </header>
      {sheet.section === "AccountSection" && (
        <>
          {(expiring || session.phase === "KeyRefused" || session.phase === "KeyExpired") && (
            <section aria-label={`${authority.name} sign-in`} className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-warn"><Clock aria-hidden className="size-4" />
                {session.phase === "KeyRefused" || session.phase === "KeyExpired" ? "Sign in again" : `Sign-in ends ${day(session.account.expiresAt)}`}
              </p>
              <Button variant="outline" onClick={() => act(Effect.flatMap(Effect.service(SignInScreen), (s) => s.open()))}>Sign in again</Button>
            </section>
          )}
          <MembershipPanel
            email={details.email} summary={summary} admission={admission} billing={billing} sheet={sheet}
            onManagePlan={() => section("PlansSection")} onAddFunds={() => section("FundsSection")} onToggleCode={() => sheetDo((s) => s.toggleCode())}
            onRedeem={(code) => membership((m) => m.redeem(code))}
          />
          <ul className="flex flex-col">
            <ListRow asChild title="Google" leading={<Mail aria-hidden />}><button type="button" disabled={!canOpenSection(sheet, "GoogleSection", true)} onClick={() => section("GoogleSection")}>Google</button></ListRow>
            <ListRow asChild title="Hosted results" leading={<CalendarClock aria-hidden />}><button type="button" disabled={!canOpenSection(sheet, "DelegationSection", true)} onClick={() => section("DelegationSection")}>Hosted results</button></ListRow>
            <ListRow asChild title="AI provider" leading={<Bot aria-hidden />}><button type="button" disabled={!canOpenSection(sheet, "ProviderSection", true)} onClick={() => section("ProviderSection")}>AI provider</button></ListRow>
          </ul>
          {sheet.reviewOwner !== 0 ? (
            <section aria-label="Sign out" className="flex flex-col gap-3">
              <p className="flex items-center gap-2"><Smartphone aria-hidden className="size-4" />Data stays on this phone</p>
              <div className="flex gap-2">
                <Button variant="destructive" disabled={!canConfirmSignOut(sheet)} onClick={() => sheetDo((s) => s.confirmSignOut())}>Sign out</Button>
                <Button variant="ghost" onClick={() => sheetDo((s) => s.cancelSignOut())}>Keep</Button>
              </div>
            </section>
          ) : (
            <Button variant="ghost" className="self-start" disabled={!canAskSignOut(sheet)} onClick={() => sheetDo((s) => s.askSignOut())}><LogOut aria-hidden />Sign out</Button>
          )}
          {session.revocation === "HereOnly" && <p role="status">Signed out here only</p>}
          {session.testMocks && (
            <DeveloperPanel
              bridge={bridge} dedicated={dedicated}
              onBridgeSignIn={() => act(Effect.flatMap(Effect.service(DevBridgeSignIn), (b) => b.signIn()))} onBridgeCancel={() => act(Effect.flatMap(Effect.service(DevBridgeSignIn), (b) => b.cancel()))}
              onReview={() => act(Effect.flatMap(Effect.service(DedicatedSetup), (d) => d.review()))} onAccept={() => act(Effect.flatMap(Effect.service(DedicatedSetup), (d) => d.accept()))}
              onDecline={() => act(Effect.flatMap(Effect.service(DedicatedSetup), (d) => d.decline()))} onPoll={() => act(Effect.flatMap(Effect.service(DedicatedSetup), (d) => d.poll()))}
              onFinalize={() => act(Effect.flatMap(Effect.service(DedicatedSetup), (d) => d.finalize()))}
            />
          )}
        </>
      )}
      {sheet.section === "PlansSection" && (
        <PlanManager
          billing={billing} details={details}
          onSubscribe={(plan) => membership((m) => m.subscribe(plan))} onChange={(target) => membership((m) => m.change(target))}
          onCancel={() => membership((m) => m.cancel())} onKeep={() => membership((m) => m.keep())} onSendCode={() => membership((m) => m.sendCode())}
          onVerifyCode={(code) => membership((m) => m.verifyCode(code))} onConfirmChange={() => membership((m) => m.confirmChange())}
          onConfirmCancel={() => membership((m) => m.confirmCancel())} onApplyReferral={(code) => membership((m) => m.applyReferral(code))}
          onShareReferral={(code) => void (navigator.share ? navigator.share({ text: code }).catch(() => undefined) : navigator.clipboard?.writeText(code).catch(() => undefined))}
          onClose={back}
        />
      )}
      {sheet.section === "FundsSection" && <FundsForm billing={billing} onAdd={(cents) => membership((m) => m.addFunds(cents))} onClose={back} />}
      {sheet.section === "GoogleSection" && (
        <GooglePanel
          google={google} accounts={rows} access={access}
          onConnect={(capabilities) => googleDo((g) => g.connect(capabilities))} onAllowCalendar={() => googleDo((g) => g.allowCalendar())}
          onCancel={() => googleDo((g) => g.cancel())} onDisconnect={() => googleDo((g) => g.disconnect())} onReload={() => googleDo((g) => g.reload())}
          onAccess={(field, value, expected) => act(Effect.flatMap(Effect.service(GoogleAgentAccess), (a) => a.set(field, value, expected)))}
        />
      )}
      {sheet.section === "DelegationSection" && (
        <DelegationPanel
          delegation={delegation} details={delegationDetails}
          onStart={(email, calendar) => act(Effect.flatMap(Effect.service(CloudDelegation), (d) => d.start(email, calendar)))}
          onCheck={() => act(Effect.flatMap(Effect.service(CloudDelegation), (d) => d.checkStatus()))}
          onCancel={() => act(Effect.flatMap(Effect.service(CloudDelegation), (d) => d.cancel()))}
          onRevoke={(grantId) => act(Effect.flatMap(Effect.service(CloudDelegation), (d) => d.revoke(grantId)))}
        />
      )}
      {sheet.section === "ProviderSection" && (
        <section aria-label="AI provider" className="flex gap-2">
          <Button variant={sheet.mode === "CloudMode" ? "primary" : "outline"} disabled={!canSwitchMode(sheet, "CloudMode")} onClick={() => sheetDo((s) => s.switchMode("CloudMode"))}><CreditCard aria-hidden />{authority.name}</Button>
          <Button variant={sheet.mode === "DirectMode" ? "primary" : "outline"} disabled={!canSwitchMode(sheet, "DirectMode")} onClick={() => sheetDo((s) => s.switchMode("DirectMode"))}><Bot aria-hidden />Own keys</Button>
        </section>
      )}
      <Button variant="ghost" className="self-start" onClick={close}>Done</Button>
    </main>
  );
}
