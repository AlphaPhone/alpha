/**
 * Alpha binding of the Eliza Cloud subscription entitlement client (issue #410, P-26).
 *
 * Verification of the signed short-lived entitlement, account binding, admission, background
 * refresh, expiry/outage states and Cloud refusal parsing with retry times live upstream in
 * `@elizaos/cloud-sdk/subscription-entitlement`, projected from the pinned checkout; this module
 * re-exports only those. The owner-facing copy (plan description, allowance, refusal and
 * redemption messages, retry times and the account summary) is Alpha's own, in
 * `../ui/cloud/subscription-presentation.ts`, and Alpha supplies its product names and
 * subscription-first presentation here. Nothing here selects a price, quota, allowance or limit;
 * turns never read billing.
 */
import {
  describeSubscription as sharedDescribeSubscription,
  redeemFailureMessage as sharedRedeemFailureMessage,
  retryDuration,
  serviceLimitMessage as sharedServiceLimitMessage,
  subscriptionSummary as sharedSubscriptionSummary,
  type SubscriptionCopy,
  type SubscriptionDescription,
  type SubscriptionSummary,
} from '../ui/cloud/subscription-presentation.ts';
import {
  isEntitlementSignInFailure,
  type ServiceLimit,
  type SubscriptionView,
} from '../../../../.eliza/client-features/packages/cloud/sdk/src/subscription-entitlement.ts';

import { formatMonthDay, formatTime } from '../prototype/locale-time.ts';
import { CloudResidentBindingError, type ResidentAdmission } from '../../../../.eliza/client-features/packages/auth/src/auth/cloud-resident-binding.ts';
// The shared client's non-presentation surface. Its owner-facing copy is not re-exported: Alpha's
// presentation module owns it.
export {
  BILLING_LIMITS_PATH, CLOCK_SKEW_MS, CREDIT_BALANCE_MAX_AGE_MS, checkEntitlement, clearEntitlementKeyCache, decodeEntitlement,
  ENTITLEMENT_AUDIENCE, ENTITLEMENT_FORMAT_VERSION, ENTITLEMENT_KEYS_PATH, ENTITLEMENT_PATH, ENTITLEMENT_TYPE, EntitlementError,
  EntitlementRefresher, entitlementClaims, entitlementFromResponse, entitlementKeysFromResponse, FALLBACK_REFRESH_MS,
  fallbackPlanFromLimits, isEntitlementSignInFailure, KEY_CACHE_MS, MAX_ENTITLEMENT_KEYS, MAX_ENTITLEMENT_LENGTH,
  MAX_ENTITLEMENT_LIFETIME_MS, nextRefreshDelay, normalizeSubscriptionCode, organizationCreditFromLimits, planAdmission,
  REDEEM_PATH, REFRESH_RETRY_MAX_MS, REFRESH_RETRY_MIN_MS, readServiceLimit, redeemedSubscriptionGrant, redeemFailureForStatus,
  redeemResultFromResponse, SubscriptionRedeemError, subscriptionGrantFromSnapshot, verifyEntitlement,
  type AllowancePeriod, type AllowanceUnit, type CountAllowance, type EntitlementCheck, type EntitlementErrorCode,
  type EntitlementExpectation, type EntitlementRefresherOptions, type EntitlementSource, type FallbackPlan,
  type OrganizationCreditBalance, type PeriodAllowance, type PlanAdmission, type PlanAllowance, type PlanStatus,
  type RedeemedGrant, type RedeemFailureCode, type RedeemResult, type RefresherTimers, type ServiceLimit,
  type SubscriptionEntitlement, type SubscriptionGrantAllowance, type SubscriptionGrantOptions, type SubscriptionGrantState,
  type SubscriptionView,
} from '../../../../.eliza/client-features/packages/cloud/sdk/src/subscription-entitlement.ts';
export {
  CHOOSE_PLAN_LABEL, MANAGE_PLAN_LABEL, redeemSuccessMessage, retryDuration, serviceLimitNextChange,
  type SubscriptionCopy, type SubscriptionDescription, type SubscriptionSummary,
} from '../ui/cloud/subscription-presentation.ts';

/** Alpha's names in shared copy; the service name is the configured deployment's. */
export function alphaSubscriptionCopy(serviceName = 'Cloud'): SubscriptionCopy {
  return { serviceName, productName: 'Alpha Phone', deviceNoun: 'phone' };
}
export function describeSubscription(view: SubscriptionView | null | undefined, serviceName = 'Cloud'): SubscriptionDescription {
  if (view?.kind === 'credits') return {
    headline: 'No plan',
    detail: '',
    manage: true,
    manageLabel: 'Choose plan',
  };
  return sharedDescribeSubscription(view, alphaSubscriptionCopy(serviceName));
}
/** The shared reset time format (month, day, hour, minute). */
function clock(at: number): string {
  // Device locale and 12/24-hour choice, as every displayed time in Alpha.
  try {
    const date = new Date(at);
    return `${formatMonthDay(date)}, ${formatTime(date)}`;
  } catch {
    return new Date(at).toISOString();
  }
}
/**
 * Plan refusals in chat say the reason once. The purchase reassurance sits on the Manage card and
 * in the Settings plan detail, beside the plan action; plan, sign-in and Cloud stay distinct (P-43).
 */
export function serviceLimitMessage(limit: ServiceLimit | null, now: number = Date.now(), serviceName = 'Cloud'): string {
  if (limit?.kind === 'allowance-exhausted') {
    const reset = limit.resetsAt != null && limit.resetsAt > now
      ? ` · resets ${clock(limit.resetsAt)}`
      : limit.retryAfterMs != null ? ` · resets in ${retryDuration(limit.retryAfterMs)}` : '';
    return `Limit reached${reset}`;
  }
  if (limit?.kind === 'subscription-required') return 'Plan needed';
  if (limit?.kind === 'billing-refused') return 'Billing declined';
  return sharedServiceLimitMessage(limit, now, alphaSubscriptionCopy(serviceName));
}
export function redeemFailureMessage(error: unknown, serviceName = 'Cloud'): string {
  return sharedRedeemFailureMessage(error, alphaSubscriptionCopy(serviceName));
}
export function subscriptionSummary(view: SubscriptionView | null | undefined, options: { planEndsAt?: number | null; lastLimit?: ServiceLimit | null; lastLimitAt?: number | null; now?: number; serviceName?: string } = {}): SubscriptionSummary {
  const { serviceName, ...rest } = options;
  return { ...sharedSubscriptionSummary(view, { ...rest, copy: alphaSubscriptionCopy(serviceName) }), ...describeSubscription(view, serviceName) };
}
/** A Cloud identity read that failed without Cloud refusing the credential (identityReadRefused). */
export class CloudIdentityUnreachable extends Error {
  constructor(cause: unknown) {
    super('Cloud could not be reached', { cause });
    this.name = 'CloudIdentityUnreachable';
  }
}
/** A Cloud outage or no network: not a refusal of the account or the plan. The transports reject
 * with these messages and no stable code; a Cloud HTTP answer is unreachable only for 408, 429 or 5xx. */
export function cloudUnreachable(error: unknown): boolean {
  if (error instanceof CloudIdentityUnreachable) return true;
  if (!(error instanceof Error) || error.name === 'AbortError') return false;
  const { code, status } = error as { code?: unknown; status?: unknown };
  if (error.name === 'CloudProtocolError') return code === 'http' && typeof status === 'number' && (status === 408 || status === 429 || status >= 500);
  return /^(Connection request failed|Connection timed out|Request cancelled)$/.test(error.message);
}
/** Cloud refused the saved credential while reading its identity: a 401 or an explicit credential
 * code, the shared entitlement client's rule. Any other failed read (an edge 403 or 404, a redirect,
 * a transport or secure-storage rejection) is not a refusal. */
export function identityReadRefused(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { status, code } = error as { status?: unknown; code?: unknown };
  return status === 401 || code === 'expired' || code === 'credentials-missing' || code === 'account-changed';
}
/**
 * What the phone does with a resident admission (the shared controller's reason): the inference
 * binding, the plan view, and whether the sign-in is detached, its offline grace forgotten or the
 * owner asked to sign in. Never whether the agent runs. `attached`: a Cloud connection is held;
 * `verified`: it is the account this admission verified.
 */
type ResidentAdmissionOutcome = {
  binding: ResidentAdmission['binding'];
  view: { residentPlanNotice: 'offline' | 'needs-plan' | null; residentSubscription: SubscriptionView | null; planEndsAt: number | null; residentSavedCredential?: false };
  signIn?: 'required' | 'rejected' | 'account-changed';
  detach?: boolean;
  forgetPlan?: boolean;
};
export function residentAdmissionOutcome(admission: ResidentAdmission<SubscriptionView>, connection: { attached: boolean; verified: boolean }): ResidentAdmissionOutcome {
  const outage: SubscriptionView = { kind: 'unavailable', reason: 'outage' };
  switch (admission.reason) {
    case 'signed-out':
      // First run or signed out: sign-in is required, and the agent runs meanwhile without Cloud inference.
      return { binding: 'unbound', view: { residentSavedCredential: false, residentSubscription: null, residentPlanNotice: null, planEndsAt: null }, signIn: 'required', detach: connection.attached };
    case 'offline':
      // A plan verified recently for this sign-in keeps its binding; nothing is said about it.
      return { binding: admission.binding, view: { residentPlanNotice: 'offline', residentSubscription: outage, planEndsAt: admission.recent?.endsAt ?? null } };
    case 'sign-in-rejected':
    case 'account-changed': {
      // The shared controller's own account-changed fence (a newer credential replaced this one) is
      // not a refusal of this sign-in: it never detaches and leaves the plan grace to the newer one.
      // Before the identity was verified only a rejected read of this sign-in detaches it.
      const fence = admission.error instanceof CloudResidentBindingError;
      const rejected = admission.reason === 'sign-in-rejected';
      const detach = !admission.identity ? rejected && connection.attached : !fence && isEntitlementSignInFailure(admission.error) && connection.verified;
      return { binding: 'unbound', view: { residentPlanNotice: null, residentSubscription: null, planEndsAt: null }, signIn: rejected ? 'rejected' : 'account-changed', detach, forgetPlan: rejected && !fence };
    }
    case 'plan-unavailable':
      return { binding: 'unbound', view: { residentPlanNotice: 'needs-plan', residentSubscription: outage, planEndsAt: null } };
    case 'needs-plan':
      // The plan notice offers Redeem code / Choose a plan / Check plan again; nothing is bound.
      return { binding: 'unbound', view: { residentSubscription: admission.plan?.view ?? null, residentPlanNotice: 'needs-plan', planEndsAt: null } };
    case 'admitted':
      return { binding: 'cloud', view: { residentSubscription: admission.plan?.view ?? null, residentPlanNotice: null, planEndsAt: admission.endsAt ?? null } };
  }
}
