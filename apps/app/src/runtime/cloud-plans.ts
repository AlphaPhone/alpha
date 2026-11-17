/**
 * In-app subscription management (docs/alpha-cloud.md). Every plan action happens in Alpha Phone:
 * there is no web billing page to visit.
 *
 * Two authorities, as upstream Cloud defines them:
 * - The phone's own sign-in key (`eliza_mobile_`) reads plans and the subscription snapshot,
 *   starts and confirms a checkout (`presentation: "mobile"`, which returns to the app's
 *   registered `/billing/return` App Link), reads the owner's referral code and applies one.
 * - Plan changes and cancellation require a fresh account session. The native host obtains it
 *   with a one-time email code (`BillingAuthorityPort`) and keeps it in memory only; the renderer
 *   never sees it and names only the operation.
 *
 * Wire shapes are upstream's (`@elizaos/cloud-sdk` types.cloud-api.ts); these parsers accept only
 * what the app shows and refuse anything else as an invalid response.
 */
export type PlanKey = 'plus_monthly' | 'pro_monthly';
export const PLAN_KEYS: readonly PlanKey[] = ['plus_monthly', 'pro_monthly'];

export interface PlanOffer { key: PlanKey; name: string; amountCents: number; allowanceUsd: string }
export interface SubscriptionState {
  subscriptionId: string;
  planKey: PlanKey;
  state: 'pending' | 'incomplete' | 'active' | 'grace' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete_expired';
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  pendingPlanKey: PlanKey | null;
  /** The server's own cancel/undo descriptor: what the current state allows. */
  control: {action: 'cancel' | 'undo'; eligible: boolean; expectedSubscriptionRevision: number} | null;
  revision: number | null;
}
export interface ReferralState { code: string; totalReferrals: number; active: boolean }
export type CheckoutStart =
  | {status: 'open'; commandId: string; checkoutUrl: string; sessionId: string; expiresAt: number}
  | {status: 'completed' | 'expired' | 'stale_intent'; commandId: string};
export interface PlanChangeQuote {
  quoteId: string; direction: 'upgrade' | 'downgrade'; targetPlanKey: PlanKey;
  dueNowCents: number; recurringCents: number; effectiveAt: number | null; expiresAt: number;
}
export type CommandStatus = 'PREPARED' | 'OUTCOME_UNKNOWN' | 'APPLIED' | 'FAILED' | 'SUPERSEDED';
export interface PlanCommand { commandId: string; status: CommandStatus; failure: string | null }

export class PlanResponseError extends Error { constructor() { super('Cloud answered an unexpected plan response'); this.name = 'PlanResponseError'; } }
const bad = (): never => { throw new PlanResponseError(); };
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : bad();
const text = (value: unknown, max = 512): string => typeof value === 'string' && value.length > 0 && value.length <= max ? value : bad();
const cents = (value: unknown): number => Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : bad();
const time = (value: unknown): number => { const at = typeof value === 'string' ? Date.parse(value) : NaN; return Number.isFinite(at) ? at : bad(); };
const planKey = (value: unknown): PlanKey => PLAN_KEYS.includes(value as PlanKey) ? value as PlanKey : bad();
const usd = (value: unknown): string => typeof value === 'string' && /^\d{1,7}(\.\d{1,6})?$/.test(value) ? value : bad();
/** `{success: true, data}` envelopes, or the bare object for routes that answer without one. */
const data = (value: unknown): Record<string, unknown> => { const body = record(value); return body.success === true && 'data' in body ? record(body.data) : body; };
const revision = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && /^\d{1,15}$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

export function parsePlans(value: unknown): PlanOffer[] {
  const plans = data(value).plans;
  if (!Array.isArray(plans)) bad();
  return (plans as unknown[]).map(entry => {
    const plan = record(entry);
    return {key: planKey(plan.key), name: text(plan.name, 40), amountCents: cents(plan.amountCents), allowanceUsd: usd(record(plan.allowance).amountUsd)};
  }).sort((a, b) => a.amountCents - b.amountCents);
}

/** The organization subscription from `GET /api/v1/billing/limits`; null when there is none. */
export function parseSubscription(value: unknown): SubscriptionState | null {
  const snapshot = data(value);
  // Schema 2 snapshots carry `v2.subscription` as an observation: `{status: "available", value}`
  // when there is one; `not_applicable` (no subscription) and unavailable reads are no subscription.
  const v2 = snapshot.v2 && typeof snapshot.v2 === 'object' ? record(snapshot.v2) : null;
  if (!v2 || v2.subscription === undefined || v2.subscription === null) return null;
  const observed = record(v2.subscription);
  if (observed.status !== 'available') return null;
  const subscription = record(observed.value);
  const control = subscription.cancellationControl && typeof subscription.cancellationControl === 'object' ? record(subscription.cancellationControl) : null;
  const controlRevision = control ? revision(control.expectedSubscriptionRevision) : null;
  return {
    subscriptionId: text(subscription.subscriptionId, 128),
    planKey: planKey(subscription.planKey),
    state: (['pending', 'incomplete', 'active', 'grace', 'past_due', 'unpaid', 'canceled', 'incomplete_expired'] as const).find(state => state === subscription.state) ?? bad(),
    currentPeriodEnd: time(subscription.currentPeriodEnd),
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd === true,
    pendingPlanKey: subscription.pendingPlanKey === null || subscription.pendingPlanKey === undefined ? null : planKey(subscription.pendingPlanKey),
    control: control && (control.action === 'cancel' || control.action === 'undo') && controlRevision !== null
      ? {action: control.action, eligible: control.eligible === true, expectedSubscriptionRevision: controlRevision} : null,
    revision: controlRevision ?? revision(subscription.lifecycleRevision),
  };
}

export function parseReferral(value: unknown): ReferralState {
  const body = data(value);
  const total = body.total_referrals;
  return {code: text(body.code, 64), totalReferrals: Number.isSafeInteger(total) && (total as number) >= 0 ? total as number : bad(), active: body.is_active === true};
}

export function parseCheckout(value: unknown): CheckoutStart {
  const result = data(value), commandId = text(result.commandId, 128);
  if (result.status === 'open') {
    const url = new URL(text(result.checkoutUrl, 4096));
    // Upstream answers only Stripe's hosted page; anything else is refused before it can be opened.
    if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com' || url.username || url.password) bad();
    return {status: 'open', commandId, checkoutUrl: url.href, sessionId: text(result.sessionId, 256), expiresAt: time(result.expiresAt)};
  }
  if (result.status === 'completed' || result.status === 'expired' || result.status === 'stale_intent') return {status: result.status, commandId};
  return bad();
}

export function parseQuote(value: unknown, direction: 'upgrade' | 'downgrade'): PlanChangeQuote {
  const quote = data(value), review = record(quote.review);
  if (review.kind !== (direction === 'upgrade' ? 'upgrade_estimate' : 'downgrade_estimate')) bad();
  const recurring = record(review.recurringEstimate);
  return {
    quoteId: text(quote.quoteId, 128), direction, targetPlanKey: planKey(review.targetPlanKey),
    dueNowCents: direction === 'upgrade' ? cents(record(review.dueNow).amountDueCents) : 0,
    recurringCents: cents(recurring.amountDueCents ?? recurring.totalCents),
    effectiveAt: direction === 'downgrade' ? time(review.effectiveAt) : null,
    expiresAt: time(review.expiresAt),
  };
}

export function parseCommand(value: unknown): PlanCommand {
  const command = data(value);
  const status = (['PREPARED', 'OUTCOME_UNKNOWN', 'APPLIED', 'FAILED', 'SUPERSEDED'] as const).find(state => state === command.status) ?? bad();
  return {commandId: text(command.commandId, 128), status, failure: typeof command.failure === 'string' ? command.failure : null};
}

/** A hosted invoice for an upgrade that needs payment action (Stripe's invoice page only). */
export function parseUpgradePayment(value: unknown): {command: PlanCommand; invoiceUrl: string | null} {
  const result = data(value);
  const continuation = result.continuation === null || result.continuation === undefined ? null : record(result.continuation);
  let invoiceUrl: string | null = null;
  if (continuation) {
    const url = new URL(text(continuation.hostedInvoiceUrl, 4096));
    if (url.protocol !== 'https:' || url.hostname !== 'invoice.stripe.com' || url.username || url.password) bad();
    invoiceUrl = url.href;
  }
  return {command: parseCommand(result.command), invoiceUrl};
}

/**
 * What a confirmed upgrade became, from the confirmation's command and the payment step's answer
 * (null when that step could not be read). Only an APPLIED command is an upgrade; a payment that
 * needs action continues on Stripe's invoice page; anything else is not reported as done.
 */
export type UpgradeOutcome = {kind: 'applied'} | {kind: 'pay'; invoiceUrl: string} | {kind: 'pending'} | {kind: 'failed'};
export function upgradeOutcome(confirmed: PlanCommand, payment: {status: number; body: unknown} | null): UpgradeOutcome {
  if (confirmed.status === 'FAILED') return {kind: 'failed'};
  let step: ReturnType<typeof parseUpgradePayment> | null = null;
  if (payment && payment.status >= 200 && payment.status < 300) { try { step = parseUpgradePayment(payment.body); } catch { step = null; } }
  if (step && step.command.commandId !== confirmed.commandId) step = null;
  if (step?.invoiceUrl) return {kind: 'pay', invoiceUrl: step.invoiceUrl};
  const status = step?.command.status ?? confirmed.status;
  if (status === 'APPLIED') return {kind: 'applied'};
  if (status === 'FAILED') return {kind: 'failed'};
  return {kind: 'pending'};
}

export const formatUsd = (amountCents: number) => `$${(amountCents / 100).toLocaleString(undefined, {minimumFractionDigits: amountCents % 100 ? 2 : 0, maximumFractionDigits: 2})}`;

/** Referral codes are short public tokens; whitespace is trimmed and nothing else is changed. */
export function normalizeReferralCode(input: string): string | null {
  const code = input.trim();
  return /^[A-Za-z0-9_-]{4,64}$/.test(code) ? code : null;
}

/**
 * The operations the native billing authority performs with its in-memory account session. The
 * renderer names one of these and supplies only the listed body fields; the native host owns the
 * route, the session and the Authorization header.
 */
export type BillingOperation =
  | {operation: 'cancel' | 'undo-cancel'; subscriptionId: string; expectedSubscriptionRevision: number; idempotencyKey: string}
  | {operation: 'upgrade-review' | 'downgrade-review'; subscriptionId: string; expectedSubscriptionRevision: number; targetPlanKey: PlanKey}
  | {operation: 'upgrade-confirm' | 'downgrade-confirm'; quoteId: string; idempotencyKey: string}
  | {operation: 'upgrade-payment'; commandId: string};

export type BillingAuthorityStatus = {status: 'authorized'; expiresAt: number} | {status: 'required'};
export interface BillingAuthorityPort {
  status(): Promise<BillingAuthorityStatus>;
  /** Sends a one-time code to the signed-in account's email. */
  start(input: {email: string}): Promise<{expiresAt: number}>;
  /** Redeems the code; the session must belong to this account (native compares it with Cloud's answer). */
  verify(input: {code: string; userId: string; organizationId?: string}): Promise<BillingAuthorityStatus>;
  clear(): Promise<void>;
  /** Performs one billing operation and answers Cloud's JSON body and status. */
  perform(input: BillingOperation): Promise<{status: number; body: unknown}>;
}

/** Validates an operation before it leaves the renderer (the native host validates again). */
export function billingOperationProblem(input: BillingOperation): string | null {
  const id = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
  const key = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(value);
  switch (input.operation) {
    case 'cancel': case 'undo-cancel':
      return id(input.subscriptionId) && Number.isSafeInteger(input.expectedSubscriptionRevision) && input.expectedSubscriptionRevision >= 0 && key(input.idempotencyKey) ? null : 'invalid cancellation';
    case 'upgrade-review': case 'downgrade-review':
      return id(input.subscriptionId) && Number.isSafeInteger(input.expectedSubscriptionRevision) && input.expectedSubscriptionRevision >= 0 && PLAN_KEYS.includes(input.targetPlanKey) ? null : 'invalid plan review';
    case 'upgrade-confirm': case 'downgrade-confirm':
      return id(input.quoteId) && key(input.idempotencyKey) ? null : 'invalid plan confirmation';
    case 'upgrade-payment':
      return id(input.commandId) ? null : 'invalid payment continuation';
    default: return 'unknown operation';
  }
}
