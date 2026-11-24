/**
 * Out of funds: Cloud refused Talk or a chat turn because this account has no plan allowance and
 * no credits left, and said so with its own code. The agent has no funds to say why, so the chat
 * transcript gets one fixed line instead of model output. Talk and text chat share this one
 * wording. It is an ordinary transcript entry: never a toast, popup, banner, status line or
 * anything near the composer, and never spoken.
 *
 * Function exports only: Node contract tests evaluate this source directly.
 */
import {formatMonthDay} from '../prototype/locale-time.ts';

export type OutOfFundsSurface = 'talk' | 'chat';

/**
 * Cloud's explicit out-of-funds codes: a refusal body's `error.code`, a failed reply's
 * `terminalFailure.code` and the speech relay's refusal `reason` (the native bridge reports it as
 * its error code). A derived billing kind is not one: a billing hold (`billing_hold_active`), a
 * generic `payment_required` and a reply's bare `insufficient_credits` failure kind, which the agent
 * reports for every Cloud 402, keep the billing wording.
 */
const OUT_OF_FUNDS_CODES = new Set(['insufficient_credits', 'allowance_exhausted']);
const record = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' ? value as Record<string, unknown> : null;

/** Whether Cloud's own code says the plan allowance and credits are used up. */
export function outOfFundsCode(code: unknown): boolean {
  return typeof code === 'string' && OUT_OF_FUNDS_CODES.has(code);
}

/**
 * Whether a Talk failure is Cloud refusing this account for funds: the speech bridge's refusal code,
 * or an agent turn's reply error that the chat already read as out of funds (`outOfFunds`). Nothing
 * else is: a Cloud speech HTTP 402 carries no code and can be a billing hold, a speech 429's
 * `allowance_exhausted` is the plan's voice allowance, and transport and microphone failures are
 * not about funds.
 */
export function outOfFundsRefusal(failure: unknown): boolean {
  const row = record(failure);
  return !!row && (row.outOfFunds === true || outOfFundsCode(row.code));
}

/**
 * The first allowance reset still ahead among what the app already holds: a refusal's ServiceLimit
 * (`resetsAt`) or a verified plan view (`allowance.resetsAt`). Null when none is known.
 */
export function outOfFundsResetsAt(now: number, ...sources: unknown[]): number | null {
  for (const source of sources) {
    const row = record(source);
    const at = row && row.kind === 'active' ? record(row.allowance)?.resetsAt : row?.resetsAt;
    if (typeof at === 'number' && Number.isFinite(at) && at > now) return at;
  }
  return null;
}

/** The one out-of-funds line. The reset sentence appears only when the app holds a reset ahead. */
export function outOfFundsNotice(surface: OutOfFundsSurface, resetsAt: number | null = null, now: number = Date.now()): string {
  const stopped = surface === 'talk' ? 'so Talk stopped' : 'so I couldn’t reply';
  let reset = '';
  if (typeof resetsAt === 'number' && Number.isFinite(resetsAt) && resetsAt > now) {
    try { reset = ` Your allowance resets on ${formatMonthDay(new Date(resetsAt))}.`; } catch { reset = ''; }
  }
  return `You’re out of plan allowance and credits, ${stopped}.${reset}`;
}

/** The offer beside a billing refusal's chat line, text chat's and Talk's alike: the Subscription sheet. */
export function subscriptionOfferCard() {
  return {type: 'generic', icon: 'info', title: 'Manage plan', sub: '', planAction: 'funding'};
}
