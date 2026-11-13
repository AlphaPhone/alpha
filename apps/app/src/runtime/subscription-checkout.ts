/**
 * In-app subscription checkout for a signed-in phone (first-run plan step).
 *
 * Contract (Eliza Cloud, read at the pinned checkout: cloud/api/v1/subscriptions/{plans,checkout,
 * checkout/confirm} and cloud/sdk/src/types.cloud-api.ts):
 * - `GET /api/v1/subscriptions/plans` publishes the plan catalogue. Names and prices are Cloud's;
 *   nothing here selects a price, allowance or limit.
 * - `POST /api/v1/subscriptions/checkout {planKey, idempotencyKey, presentation:"mobile"}` answers
 *   `open` with a hosted payment page and its session id, `completed` when this intent is already
 *   paid, or `expired` / `stale_intent` when a new idempotency key is needed.
 * - The payment page returns to the app's verified link `/alphaphone/billing/return` with
 *   `result=success&session_id=...` or `result=cancel`. The link is an identifier, never payment
 *   evidence: `POST /api/v1/subscriptions/checkout/confirm {sessionId}` reads the payment from the
 *   provider and answers the settled subscription (`replayed` when it was already settled).
 *
 * The purchase intent (plan, idempotency key and, once known, the session id) is recorded before
 * the first request and survives process death, so a retry or a return after a restart continues
 * the same purchase instead of opening a second one. The record holds no credential and no payment
 * detail and is bound to the account that started it.
 *
 * This module is host-neutral: the caller supplies the Cloud requests, the browser hand-off and
 * the record's storage. It never opens anything but `https://checkout.stripe.com`.
 */

export const SUBSCRIPTION_PLANS_PATH = '/api/v1/subscriptions/plans';
export const SUBSCRIPTION_CHECKOUT_PATH = '/api/v1/subscriptions/checkout';
export const SUBSCRIPTION_CHECKOUT_CONFIRM_PATH = '/api/v1/subscriptions/checkout/confirm';
/** The hosted payment page host a mobile checkout answers (CloudConnectionPolicy.SUBSCRIPTION_CHECKOUT_HOST). */
export const SUBSCRIPTION_CHECKOUT_HOST = 'checkout.stripe.com';
/** Path of the verified app link the payment page returns to, on the build's app link host. */
export const BILLING_RETURN_PATH = '/alphaphone/billing/return';
/** A hosted checkout session lasts at most a day; an older purchase intent is not resumed. */
export const PENDING_CHECKOUT_TTL_MS = 24 * 60 * 60 * 1000;
export const PENDING_CHECKOUT_STORAGE_KEY = 'alpha.connection.subscription-checkout.v1';

const PLAN_KEY = /^(plus_monthly|pro_monthly)$/;
const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{1,200}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CheckoutPlan = {
  key: string;
  name: string;
  /** Monthly price in US cents, as Cloud publishes it. */
  amountCents: number;
  /** Included monthly usage in US dollars, when Cloud publishes one. */
  allowanceUsd: string | null;
};
export type CheckoutStart =
  | { status: 'open'; checkoutUrl: string; sessionId: string }
  | { status: 'completed' | 'expired' | 'stale_intent' };
export type CheckoutConfirmation = { subscriptionId: string | null; replayed: boolean; planName: string | null };
export type CheckoutOwner = { environment: string; userId: string; organizationId: string | null };
export type PendingCheckout = { v: 1; owner: CheckoutOwner; planKey: string; idempotencyKey: string; sessionId: string | null; startedAt: number };
export type BillingReturn = { result: 'success'; sessionId: string } | { result: 'cancel' };

export type CheckoutFailureKind =
  /** Cloud refused the saved sign-in (401, or no usable credential): the owner signs in again. */
  | 'sign-in'
  /** A different account is signed in than the one the request started with. */
  | 'account-changed'
  /** 503 account_not_ready: the account is still being prepared; retry. */
  | 'account-not-ready'
  /** 409 identity_conflict: this sign-in cannot be linked to an account automatically. */
  | 'identity-conflict'
  /** 409 otherwise: an existing subscription or checkout needs attention; read the plan again. */
  | 'billing-conflict'
  /** 403: only an owner or admin of the account manages its billing. */
  | 'not-allowed'
  | 'rate-limited'
  /** The deployed Cloud does not offer this route or presentation; use the hosted plan page. */
  | 'unsupported'
  /** Cloud or the payment provider is unavailable; retry. */
  | 'unavailable'
  /** The request did not reach Cloud. */
  | 'offline'
  /** Confirm: Cloud has not seen the payment (yet). */
  | 'not-confirmed'
  /** Confirm: Cloud does not recognise this checkout session for the account. */
  | 'unknown-session'
  /** Nothing is waiting to be confirmed for this account. */
  | 'nothing-pending';

export class SubscriptionCheckoutError extends Error {
  readonly kind: CheckoutFailureKind;
  constructor(kind: CheckoutFailureKind, options?: { cause?: unknown }) {
    super(`Subscription checkout ${kind}`, options);
    this.name = 'SubscriptionCheckoutError';
    this.kind = kind;
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function invalid(): never { throw new SubscriptionCheckoutError('unavailable'); }
function success(value: unknown): Record<string, unknown> {
  const body = record(value);
  if (!body || body.success !== true) invalid();
  return body;
}

/** Plans Cloud can sell to this phone, in Cloud's order. Unknown plan keys are not offered. */
export function plansFromResponse(value: unknown): CheckoutPlan[] {
  const data = record(success(value).data);
  if (!data || !Array.isArray(data.plans)) invalid();
  const plans: CheckoutPlan[] = [];
  for (const entry of data.plans) {
    const plan = record(entry);
    if (!plan || typeof plan.key !== 'string' || !PLAN_KEY.test(plan.key) || plan.active !== true) continue;
    if (plans.some(known => known.key === plan.key)) continue;
    if (typeof plan.name !== 'string' || !plan.name.trim() || plan.name.length > 40) invalid();
    if (plan.currency !== 'usd' || plan.interval !== 'month' || (plan.intervalCount !== undefined && plan.intervalCount !== 1)) invalid();
    if (typeof plan.amountCents !== 'number' || !Number.isSafeInteger(plan.amountCents) || plan.amountCents <= 0) invalid();
    const allowance = record(plan.allowance)?.amountUsd;
    plans.push({ key: plan.key, name: plan.name.trim(), amountCents: plan.amountCents,
      allowanceUsd: typeof allowance === 'string' && /^\d{1,7}(\.\d{1,2})?$/.test(allowance) ? allowance : null });
  }
  return plans;
}

/** `$20` or `$19.99`: the published monthly price, never rounded. */
export function planPrice(plan: Pick<CheckoutPlan, 'amountCents'>): string {
  const dollars = Math.floor(plan.amountCents / 100), cents = plan.amountCents % 100;
  return cents ? `$${dollars}.${String(cents).padStart(2, '0')}` : `$${dollars}`;
}

/** The one payment page this phone opens: HTTPS on the provider's checkout host, default port, no credentials. */
export function checkoutPageUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 4096) return null;
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  return url.protocol === 'https:' && url.hostname === SUBSCRIPTION_CHECKOUT_HOST && !url.port && !url.username && !url.password ? url.href : null;
}

export function checkoutFromResponse(value: unknown): CheckoutStart {
  const data = record(success(value).data);
  if (!data) invalid();
  if (data.status === 'completed' || data.status === 'expired' || data.status === 'stale_intent') return { status: data.status };
  const checkoutUrl = checkoutPageUrl(data.checkoutUrl);
  if (data.status !== 'open' || data.presentation !== 'mobile' || !checkoutUrl || typeof data.sessionId !== 'string' || !SESSION_ID.test(data.sessionId)) invalid();
  return { status: 'open', checkoutUrl, sessionId: data.sessionId };
}

export function confirmationFromResponse(value: unknown): CheckoutConfirmation {
  const body = success(value), data = record(body.data);
  if (!data || typeof data.replayed !== 'boolean' || (data.subscriptionId !== null && typeof data.subscriptionId !== 'string')) invalid();
  const name = record(record(body.entitlement)?.plan)?.name;
  return { subscriptionId: data.subscriptionId as string | null, replayed: data.replayed, planName: typeof name === 'string' && name.trim() && name.length <= 40 ? name.trim() : null };
}

/**
 * The payment page's return on this build's app link host. Exact scheme, host and path; `cancel`
 * carries nothing else and `success` exactly one well-formed session id. Anything else is not a
 * billing return. The native host applies the same rule before the renderer sees a return.
 */
export function parseBillingReturn(value: unknown, webOrigin: string): BillingReturn | null {
  if (typeof value !== 'string' || value.length > 512) return null;
  let url: URL, origin: URL;
  try { url = new URL(value); origin = new URL(webOrigin); } catch { return null; }
  if (url.protocol !== 'https:' || origin.protocol !== 'https:' || url.host !== origin.host || url.port || url.username || url.password || url.hash || url.pathname !== BILLING_RETURN_PATH) return null;
  const names = [...url.searchParams.keys()], result = url.searchParams.get('result');
  if (result === 'cancel') return names.length === 1 ? { result: 'cancel' } : null;
  const sessionId = url.searchParams.get('session_id');
  if (result !== 'success' || names.length !== 2 || !sessionId || !SESSION_ID.test(sessionId)) return null;
  return { result: 'success', sessionId };
}

function sameOwner(a: CheckoutOwner, b: CheckoutOwner): boolean {
  return a.environment === b.environment && a.userId === b.userId && (a.organizationId ?? null) === (b.organizationId ?? null);
}

/** A stored purchase intent, or null for anything malformed. */
export function parsePendingCheckout(value: unknown): PendingCheckout | null {
  const entry = record(value), owner = record(entry?.owner);
  if (!entry || !owner || entry.v !== 1) return null;
  if (typeof owner.environment !== 'string' || typeof owner.userId !== 'string' || !owner.userId || (owner.organizationId !== null && typeof owner.organizationId !== 'string')) return null;
  if (typeof entry.planKey !== 'string' || !PLAN_KEY.test(entry.planKey) || typeof entry.idempotencyKey !== 'string' || !UUID.test(entry.idempotencyKey)) return null;
  if (entry.sessionId !== null && (typeof entry.sessionId !== 'string' || !SESSION_ID.test(entry.sessionId))) return null;
  if (typeof entry.startedAt !== 'number' || !Number.isFinite(entry.startedAt)) return null;
  return { v: 1, owner: { environment: owner.environment, userId: owner.userId, organizationId: owner.organizationId as string | null },
    planKey: entry.planKey, idempotencyKey: entry.idempotencyKey, sessionId: entry.sessionId as string | null, startedAt: entry.startedAt };
}

/**
 * Classifies a failed plans, checkout or confirm request. HTTP refusals arrive as the Cloud
 * adapter's protocol error (`code`, `status`, parsed body `data`); anything else that is not an
 * abort is a transport failure.
 */
export function checkoutFailure(error: unknown, step: 'plans' | 'start' | 'confirm'): SubscriptionCheckoutError {
  if (error instanceof SubscriptionCheckoutError) return error;
  const fields = record(error) ?? {}, code = fields.code, status = typeof fields.status === 'number' ? fields.status : null;
  const serverCode = record(fields.data)?.code;
  const fail = (kind: CheckoutFailureKind) => new SubscriptionCheckoutError(kind, { cause: error });
  if (error instanceof Error && error.message === 'Cloud account changed' || code === 'account-changed') return fail('account-changed');
  if (code === 'credentials-missing' || code === 'expired' || status === 401) return fail('sign-in');
  if (code === 'invalid-response') return fail('unavailable');
  if (status === null) return fail(code === 'http' ? 'unavailable' : 'offline');
  if (serverCode === 'account_not_ready') return fail('account-not-ready');
  if (serverCode === 'identity_conflict') return fail('identity-conflict');
  if (status === 409) return fail('billing-conflict');
  if (status === 403) return fail('not-allowed');
  if (status === 429) return fail('rate-limited');
  if (status === 404 || status === 405 || status === 501 || status === 400) return fail(step === 'confirm' ? 'unknown-session' : 'unsupported');
  if (step === 'confirm' && (status === 408 || status >= 500)) return fail('not-confirmed');
  return fail('unavailable');
}

/** One short owner-facing line per failure. Never a provider message, a code or an identifier. */
export function checkoutFailureMessage(kind: CheckoutFailureKind): string {
  switch (kind) {
    case 'sign-in': return 'Sign in again to continue';
    case 'account-changed': return 'Account changed';
    case 'account-not-ready': return 'Your account is still being set up. Try again in a moment';
    case 'identity-conflict': return 'This sign-in can’t be linked to an account. Sign out and sign in another way';
    case 'billing-conflict': return 'This account already has a plan or a checkout in progress. Checking again';
    case 'not-allowed': return 'Only an owner or admin of this account can subscribe';
    case 'rate-limited': return 'Too many attempts. Try again in a minute';
    case 'unsupported': return 'Checkout isn’t available here';
    case 'unavailable': return 'Checkout is unavailable. Try again';
    case 'offline': return 'No connection. Try again';
    case 'not-confirmed': return 'Payment not confirmed yet';
    case 'unknown-session': return 'That checkout is no longer valid. Choose a plan again';
    case 'nothing-pending': return 'No checkout in progress';
  }
}

export interface SubscriptionCheckoutPorts {
  start(planKey: string, idempotencyKey: string, signal: AbortSignal): Promise<CheckoutStart>;
  confirm(sessionId: string, signal: AbortSignal): Promise<CheckoutConfirmation>;
  /** Hands the payment page to the system browser. */
  open(url: string, signal: AbortSignal): Promise<void>;
  /** Durable storage for the one purchase intent (JSON text, or null when none). */
  storage: { read(): string | null; write(value: string | null): void };
  uuid(): string;
  now(): number;
}

function aborted(error: unknown): boolean { return error instanceof Error && error.name === 'AbortError'; }

/** One purchase at a time for the signed-in account; every step is safe to repeat. */
export class SubscriptionCheckout {
  private readonly ports: SubscriptionCheckoutPorts;
  constructor(ports: SubscriptionCheckoutPorts) { this.ports = ports; }

  /** The purchase intent this account started within the last day, if any. */
  pending(owner: CheckoutOwner): PendingCheckout | null {
    let stored: PendingCheckout | null = null;
    try { stored = parsePendingCheckout(JSON.parse(this.ports.storage.read() ?? 'null')); } catch { stored = null; }
    if (!stored || !sameOwner(stored.owner, owner)) return null;
    const age = this.ports.now() - stored.startedAt;
    return age >= 0 && age < PENDING_CHECKOUT_TTL_MS ? stored : null;
  }
  private write(entry: PendingCheckout | null) {
    try { this.ports.storage.write(entry ? JSON.stringify(entry) : null); }
    catch { /* Without storage the purchase still works; only resume after a restart is lost. */ }
  }
  /** Forgets this account's purchase intent. Another account's record is left to expire. */
  forget(owner: CheckoutOwner) { if (this.pending(owner)) this.write(null); }

  /**
   * Starts (or continues) the purchase of one plan and opens its payment page. The same plan reuses
   * its idempotency key, so a repeat after a lost answer, a cancel or a restart continues the same
   * checkout; another plan is a new intent. `entitled`: Cloud reports this intent already paid.
   */
  async subscribe(owner: CheckoutOwner, planKey: string, signal: AbortSignal): Promise<'opened' | 'entitled'> {
    if (!PLAN_KEY.test(planKey)) throw new SubscriptionCheckoutError('unsupported');
    signal.throwIfAborted();
    const fresh = (): PendingCheckout => ({ v: 1, owner: { environment: owner.environment, userId: owner.userId, organizationId: owner.organizationId ?? null }, planKey, idempotencyKey: this.ports.uuid(), sessionId: null, startedAt: this.ports.now() });
    let entry = this.pending(owner);
    if (!entry || entry.planKey !== planKey) { entry = fresh(); this.write(entry); }
    // One new key at most: an expired or spent intent is replaced once, never in a loop.
    for (let attempt = 0; attempt < 2; attempt++) {
      let answer: CheckoutStart;
      try { answer = await this.ports.start(planKey, entry.idempotencyKey, signal); }
      catch (error) {
        if (aborted(error)) throw error;
        const failure = checkoutFailure(error, 'start');
        if (failure.kind === 'billing-conflict') {
          // The account may already have paid for this checkout: settle it before reporting a conflict.
          if (entry.sessionId) {
            try { await this.ports.confirm(entry.sessionId, signal); this.write(null); return 'entitled'; }
            catch (settle) { if (aborted(settle)) throw settle; }
          }
          this.write(null);
        }
        throw failure;
      }
      signal.throwIfAborted();
      if (answer.status === 'completed') { this.write(null); return 'entitled'; }
      if (answer.status === 'open') {
        entry = { ...entry, sessionId: answer.sessionId };
        this.write(entry);
        try { await this.ports.open(answer.checkoutUrl, signal); }
        catch (error) { if (aborted(error)) throw error; throw new SubscriptionCheckoutError('unavailable', { cause: error }); }
        return 'opened';
      }
      entry = fresh(); this.write(entry);
    }
    throw new SubscriptionCheckoutError('unavailable');
  }

  /**
   * Settles the pending checkout with Cloud. A returned session id is used only when the answer
   * that carried it was lost (the record has none); a link naming another session is ignored in
   * favour of the recorded one. A replayed confirmation is a success.
   */
  async confirm(owner: CheckoutOwner, signal: AbortSignal, returned?: { sessionId?: string }): Promise<CheckoutConfirmation> {
    signal.throwIfAborted();
    const entry = this.pending(owner);
    const sessionId = entry?.sessionId ?? (entry && returned?.sessionId && SESSION_ID.test(returned.sessionId) ? returned.sessionId : null);
    if (!entry || !sessionId) throw new SubscriptionCheckoutError('nothing-pending');
    let confirmation: CheckoutConfirmation;
    try { confirmation = await this.ports.confirm(sessionId, signal); }
    catch (error) {
      if (aborted(error)) throw error;
      const failure = checkoutFailure(error, 'confirm');
      // Cloud does not know the session: keep the intent (and its key) but stop asking about it.
      if (failure.kind === 'unknown-session') this.write({ ...entry, sessionId: null });
      throw failure;
    }
    signal.throwIfAborted();
    this.write(null);
    return confirmation;
  }
}

/**
 * What the plan chooser shows. `catalogue`: 'absent' when the deployed Cloud publishes no plan
 * catalogue (the hosted plan page is used instead); 'unavailable' when it could not be read.
 * `step`: 'awaiting' while a payment page is open for `planKey`.
 */
export type CheckoutView = {
  catalogue: 'loading' | 'ready' | 'absent' | 'unavailable';
  plans: CheckoutPlan[];
  step: 'choose' | 'awaiting';
  planKey: string | null;
  error: string;
  notice: string;
};
/** Whether the in-app chooser replaces the hosted plan page for this view. */
export function chooserShown(view: CheckoutView | null | undefined): view is CheckoutView {
  return !!view && (view.step === 'awaiting' || view.catalogue === 'ready' && view.plans.length > 0);
}
