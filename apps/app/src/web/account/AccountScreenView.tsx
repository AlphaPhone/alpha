// spec/account/sheet.md, "Story: Look after my account in one place"; spec/account/session.md, "Story: Keep my sign-in working until I sign out"; spec/account/provider.md, "Story: Use my own keys instead of Cloud"
import { ArrowLeft, Bot, CalendarClock, Clock, LogOut, Mail, Smartphone, UserRoundPlus } from "lucide-react";
import type { AgentAccess } from "../../../gen/account__agentAccess.ts";
import type { Billing } from "../../../gen/account__billing.ts";
import type { Dedicated } from "../../../gen/account__dedicated.ts";
import type { Delegation } from "../../../gen/account__delegation.ts";
import type { Bridge } from "../../../gen/account__devBridge.ts";
import type { Google } from "../../../gen/account__google.ts";
import type { Admission } from "../../../gen/account__plan.ts";
import type { Provider } from "../../../gen/account__provider.ts";
import type { Session } from "../../../gen/account__session.ts";
import { type Section, type Sheet, canAskSignOut, canConfirmSignOut, canOpenSection } from "../../../gen/account__sheet.ts";
import type { BillingDetails } from "../../account/billing.vibe";
import type { DelegationDetails } from "../../account/delegation.vibe";
import type { PlanSummary } from "../../account/entitlement.vibe";
import type { GoogleAccount } from "../../account/google.vibe";
import { Button, ListRow } from "../components/ui/index.ts";
import { DelegationPanel, type DelegationPanelProps } from "./DelegationPanel.tsx";
import { DeveloperPanel, type DeveloperPanelProps } from "./DeveloperPanel.tsx";
import { FundsForm, type FundsFormProps } from "./FundsForm.tsx";
import { GooglePanel, type GooglePanelProps } from "./GooglePanel.tsx";
import { MembershipPanel } from "./MembershipPanel.tsx";
import { PlanManager, type PlanManagerProps } from "./PlanManager.tsx";
import { ProviderPanel, type ProviderPanelProps } from "./ProviderPanel.tsx";

/** The Account screen's machine states, the account's reads and the owner's actions on each section. */
export interface AccountScreenViewProps {
  /** The signed-in session. */
  session: Session;
  /** The sheet: the section shown, a sign-out review, the expiry notice and the code entry. */
  sheet: Sheet;
  billing: Billing;
  /** The plan admission, with what the native host confirmed of the agent's inference. */
  admission: Admission;
  google: Google;
  /** The agent's Google switches. */
  access: AgentAccess;
  delegation: Delegation;
  provider: Provider;
  bridge: Bridge;
  dedicated: Dedicated;
  /** Upstream's subscription view of the last billing snapshot read for this account. */
  summary: PlanSummary;
  /** The plans, referral, address and quote as Cloud last gave them. */
  details: BillingDetails;
  /** The connected Google accounts as last read. */
  accounts: ReadonlyArray<GoogleAccount>;
  /** The hosted results grant and its pending removals. */
  delegationDetails: DelegationDetails;
  /** The deployment's display name, such as "Eliza Cloud". */
  serviceName: string;
  /** Own keys are being entered from sign-in: only the provider form shows, with a Back that leaves it. */
  ownKeys: boolean;
  /** Leave the app. */
  onClose: () => void;
  /** Open one section of the sheet. */
  onSection: (section: Section) => void;
  /** Return from a section to the account. */
  onBack: () => void;
  /** Open sign-in again for an ending or refused key. */
  onSignInAgain: () => void;
  onToggleCode: () => void;
  /** Redeem a membership code; it is never stored or echoed. */
  onRedeem: (code: string) => void;
  onAskSignOut: () => void;
  onConfirmSignOut: () => void;
  onCancelSignOut: () => void;
  /** Add funds of this many cents; payment continues on Stripe's page. */
  onAddFunds: FundsFormProps["onAdd"];
  /** Leave the own-keys form entered from sign-in. */
  onLeaveOwnKeys: () => void;
  /** The provider form's actions. */
  providerActs: Omit<ProviderPanelProps, "provider" | "serviceName" | "onBack">;
  /** The plan manager's actions. */
  planActs: Omit<PlanManagerProps, "billing" | "details" | "onClose">;
  /** The Google section's actions. */
  googleActs: Omit<GooglePanelProps, "google" | "accounts" | "access">;
  /** The hosted results section's actions. */
  delegationActs: Omit<DelegationPanelProps, "delegation" | "details">;
  /** The developer panel's actions, shown only in a test-mock build. */
  developerActs: Omit<DeveloperPanelProps, "bridge" | "dedicated">;
}

const day = (at: number) => new Date(at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

/**
 * The signed-in Account screen: membership, plan, Google, hosted results and the AI provider, with sign-out reviewed for the account it names.
 * @model spec/account/sheet.md
 * @design design.md
 */
export function AccountScreenView(props: AccountScreenViewProps) {
  const { session, sheet, billing, provider, serviceName, onSection, onBack, onClose } = props;
  const providerForm = <ProviderPanel provider={provider} serviceName={serviceName} {...props.providerActs} onBack={props.ownKeys ? props.onLeaveOwnKeys : undefined} />;
  if (props.ownKeys) return <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6"><h1 className="font-display text-3xl">AI provider</h1>{providerForm}</main>;
  const keyEnded = session.phase === "KeyRefused" || session.phase === "KeyExpired";
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-2">
        {sheet.section !== "AccountSection" && <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack}><ArrowLeft aria-hidden /></Button>}
        <h1 className="font-display text-3xl">Account</h1>
      </header>
      {sheet.section === "AccountSection" && (
        <>
          {session.created && <p role="status" className="flex items-center gap-2 text-ok"><UserRoundPlus aria-hidden className="size-4" />New account</p>}
          {session.priorUnconfirmed && <p role="status" className="text-warn">Signed in · check devices</p>}
          {(sheet.expiryShown || keyEnded) && (
            <section aria-label={`${serviceName} sign-in`} className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-warn"><Clock aria-hidden className="size-4" />
                {keyEnded ? "Sign in again" : `Sign-in ends ${day(session.account.expiresAt)}`}
              </p>
              <Button variant="outline" onClick={props.onSignInAgain}>Sign in again</Button>
            </section>
          )}
          <MembershipPanel
            email={props.details.email} summary={props.summary} admission={props.admission} billing={billing} sheet={sheet} provider={provider} serviceName={serviceName}
            onManagePlan={() => onSection("PlansSection")} onAddFunds={() => onSection("FundsSection")} onToggleCode={props.onToggleCode}
            onRedeem={props.onRedeem}
          />
          <ul className="flex flex-col">
            <ListRow asChild title="Google" leading={<Mail aria-hidden />}><button type="button" disabled={!canOpenSection(sheet, "GoogleSection", true)} onClick={() => onSection("GoogleSection")}>Google</button></ListRow>
            <ListRow asChild title="Hosted results" leading={<CalendarClock aria-hidden />}><button type="button" disabled={!canOpenSection(sheet, "DelegationSection", true)} onClick={() => onSection("DelegationSection")}>Hosted results</button></ListRow>
            <ListRow asChild title="AI provider" leading={<Bot aria-hidden />}><button type="button" disabled={!canOpenSection(sheet, "ProviderSection", true)} onClick={() => onSection("ProviderSection")}>AI provider</button></ListRow>
          </ul>
          {sheet.reviewOwner !== 0 ? (
            <section aria-label="Sign out" className="flex flex-col gap-3">
              <p className="flex items-center gap-2"><Smartphone aria-hidden className="size-4" />Data stays on this phone</p>
              <div className="flex gap-2">
                <Button variant="destructive" disabled={!canConfirmSignOut(sheet)} onClick={props.onConfirmSignOut}>Sign out</Button>
                <Button variant="ghost" onClick={props.onCancelSignOut}>Keep</Button>
              </div>
            </section>
          ) : (
            <Button variant="ghost" className="self-start" disabled={!canAskSignOut(sheet)} onClick={props.onAskSignOut}><LogOut aria-hidden />Sign out</Button>
          )}
          {session.revocation === "HereOnly" && <p role="status">Signed out here only</p>}
          {session.testMocks && <DeveloperPanel bridge={props.bridge} dedicated={props.dedicated} {...props.developerActs} />}
        </>
      )}
      {sheet.section === "PlansSection" && <PlanManager billing={billing} details={props.details} {...props.planActs} onClose={onBack} />}
      {sheet.section === "FundsSection" && <FundsForm billing={billing} onAdd={props.onAddFunds} onClose={onBack} />}
      {sheet.section === "GoogleSection" && <GooglePanel google={props.google} accounts={props.accounts} access={props.access} {...props.googleActs} />}
      {sheet.section === "DelegationSection" && <DelegationPanel delegation={props.delegation} details={props.delegationDetails} {...props.delegationActs} />}
      {sheet.section === "ProviderSection" && providerForm}
      <Button variant="ghost" className="self-start" onClick={onClose}>Done</Button>
    </main>
  );
}
