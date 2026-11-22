// spec/account/signIn.md, "Story: Choose how to sign in"; spec/account/billing.md, "Story: Choose or change my plan in Alpha"; spec/account/google.md, "Story: Connect my Google account with the access I choose"
import { initial as accessInitial, type AgentAccess } from "../../../gen/account__agentAccess.ts";
import { initial as billingInitial, type Billing } from "../../../gen/account__billing.ts";
import { initial as delegationInitial, type Delegation } from "../../../gen/account__delegation.ts";
import { initial as googleInitial, type Google } from "../../../gen/account__google.ts";
import { initial as sessionInitial, type Session } from "../../../gen/account__session.ts";
import { initial as sheetInitial, type Sheet } from "../../../gen/account__sheet.ts";
import { initial as signInInitial, type SignIn } from "../../../gen/account__signIn.ts";
import type { BillingDetails } from "../../account/billing.vibe";
import type { DelegationDetails } from "../../account/delegation.vibe";
import type { GoogleAccount } from "../../account/google.vibe";

const ready = { known: true, google: true, email: true, phone: true };

/** The required page with every method ready. */
export const chooser: SignIn = { ...signInInitial, host: "AndroidHost", hostFixed: true, startupResolved: true, screen: "Choose", methods: ready, net: "NetOnline", probes: 1, readinessOwner: true };
/** The required page while the phone is offline. */
export const offlineChooser: SignIn = { ...chooser, net: "NetOffline" };
/** A code on its way, waiting for the owner to type it. */
export const codeStep: SignIn = { ...chooser, screen: "CodeStep", attempt: 1, attempts: 1, address: true, cooldown: true };
/** A code that can no longer be verified. */
export const spentCode: SignIn = { ...codeStep, stale: true, fault: "CodeSpent", cooldown: false };
/** A second verification. */
export const factorStep: SignIn = { ...codeStep, screen: "FactorStep", factor: "TotpFactor" };
/** Waiting for Google. */
export const googleWait: SignIn = { ...chooser, screen: "GoogleWait", work: "GoogleWork" };

/** A signed-in session. */
export const signedIn: Session = {
  ...sessionInitial, loaded: true, startupResolved: true, phase: "SignedIn", generation: 1,
  account: { userId: "user-1", organizationId: "org-1", credentialId: "key-1", expiresAt: 1_900_000_000_000 },
};
/** A key Cloud no longer accepts. */
export const keyRefused: Session = { ...signedIn, phase: "KeyRefused", expiryWarning: true };

/** The open account sheet of a signed-in owner. */
export const openSheet: Sheet = { ...sheetInitial, owner: 1, open: true, covered: true };
/** The sign-out review. */
export const reviewingSignOut: Sheet = { ...openSheet, reviewOwner: 1 };

/** The plan manager with no plan yet. */
export const managerNoPlan: Billing = { ...billingInitial, configured: true, owner: 1, manager: "ManagerShown" };
/** The plan manager on Plus. */
export const managerOnPlus: Billing = { ...managerNoPlan, current: { tag: "OnPlan", plan: "Plus", endsAtPeriodEnd: false, paymentDue: false } };
/** A reviewed upgrade, waiting for confirmation. */
export const quotedUpgrade: Billing = {
  ...managerOnPlus, authority: "Authorized", authorityOwner: 1, pending: { tag: "ChangeTo", target: "Pro" }, quote: { tag: "Quoted", quoted: "Pro", quoteExpired: false },
};
/** A plan change waiting for the owner's one-time code. */
export const codeForChange: Billing = { ...managerOnPlus, authority: "CodeSent", pending: { tag: "CancelPlan" } };
/** The funds form. */
export const fundsForm: Billing = { ...managerNoPlan, manager: "ManagerClosed", funds: "FundsForm" };

/** Plans as Cloud offers them. */
export const details: BillingDetails = {
  offers: [
    { key: "plus_monthly", name: "Plus", amountCents: 3000, currency: "usd", interval: "month", allowance: { amountUsd: "25" } },
    { key: "pro_monthly", name: "Pro", amountCents: 10000, currency: "usd", interval: "month", allowance: { amountUsd: "90" } },
  ],
  referral: { code: "ALPHA-123", total_referrals: 2, is_active: true },
  email: "owner@example.com",
  quote: { dueNowCents: 7000, recurringCents: 10000, effectiveAt: 1_900_000_000_000, expiresAt: 1_900_000_600_000 },
  renewsAt: 1_900_000_000_000,
};

/** A connected Google account with read access. */
export const googleConnected: Google = {
  ...googleInitial, owner: 1, panel: "SettingsPanel", reads: 1, verified: true, held: ["GmailRead", "CalendarRead"], account: 1, readGrant: true, calendarGrant: true,
};
/** Waiting for Google's consent. */
export const googleWaiting: Google = { ...googleConnected, phase: "GWaiting", attempt: 1, dispatches: 1, requested: ["GmailRead", "GmailModify", "CalendarRead"], heldAtRequest: ["GmailRead", "CalendarRead"] };
/** The connected account rows. */
export const googleRows: ReadonlyArray<GoogleAccount> = [{ connectionId: "conn-1", email: "owner@example.com", grantedCapabilities: ["google.basic_identity", "google.gmail.triage", "google.calendar.read"] }];

/** The agent's Google switches as the host enforces them. */
export const accessSaved: AgentAccess = { ...accessInitial, host: accessInitial.saved, hostUnconfirmed: false };

/** A pending delegation. */
export const delegationWaiting: Delegation = { ...delegationInitial, owner: 1, record: "WaitingRecord", cloud: "CloudWaiting", starts: 1 };
/** A connected delegation. */
export const delegationConnected: Delegation = { ...delegationInitial, owner: 1, grant: true, cloud: "CloudComplete" };
/** Its details. */
export const delegationDetails: DelegationDetails = { grantId: "grant-1", pendingRevocations: [], email: true, calendar: true };
