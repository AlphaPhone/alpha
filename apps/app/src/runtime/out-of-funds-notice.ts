/**
 * Out of funds: Cloud refused Talk or a chat turn because this account has no plan allowance and
 * no credits left. The agent has no funds to say why, so the chat transcript gets one fixed line
 * instead of model output. Talk and text chat share this one wording. It is an ordinary transcript
 * entry: never a toast, popup, banner, status line or anything near the composer, and never spoken.
 *
 * Function exports only: Node contract tests evaluate this source directly.
 */
import {formatMonthDay} from '../prototype/locale-time.ts';

export type OutOfFundsSurface = 'talk' | 'chat';

/** Cloud's 402 `error.code`, the speech relay's refusal `reason` and an agent reply's failure kind. */
const OUT_OF_FUNDS_CODES = new Set(['insufficient_credits', 'allowance_exhausted']);
/** The shared ServiceLimit kinds Alpha reads the same refusals as (subscription-entitlement.ts). */
const OUT_OF_FUNDS_LIMITS = new Set(['billing-refused', 'allowance-exhausted']);
const record = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' ? value as Record<string, unknown> : null;

/** A shared ServiceLimit (or its kind) that says the plan allowance and credits are used up. */
export function outOfFundsLimit(limit: unknown): boolean {
  const kind = typeof limit === 'string' ? limit : record(limit)?.kind;
  return typeof kind === 'string' && OUT_OF_FUNDS_LIMITS.has(kind);
}

/**
 * Whether a failure is Cloud refusing this account for funds: a server reason (`insufficient_credits`,
 * `allowance_exhausted`, from the speech bridge or a reply), a Cloud speech HTTP 402 or an allowance
 * 429, or a reply error that carries a billing or allowance ServiceLimit. Anything else, including a
 * 429 rate limit, a billing hold, no plan and every transport or microphone failure, is not.
 */
export function outOfFundsRefusal(failure: unknown): boolean {
  const row = record(failure);
  if (!row) return false;
  const {code, failureKind, serviceLimit} = row;
  if (typeof code === 'string' && (OUT_OF_FUNDS_CODES.has(code) || code === 'voice-http-402')) return true;
  const limitCode = code === 'voice-http-429' ? record(row.data)?.limitCode : undefined;
  if (typeof limitCode === 'string' && OUT_OF_FUNDS_CODES.has(limitCode)) return true;
  if (typeof failureKind === 'string' && (OUT_OF_FUNDS_CODES.has(failureKind) || OUT_OF_FUNDS_LIMITS.has(failureKind))) return true;
  return outOfFundsLimit(serviceLimit);
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
