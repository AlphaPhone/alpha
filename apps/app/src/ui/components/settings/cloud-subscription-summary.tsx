/**
 * Shared account surface for an Eliza Cloud subscription: plan state, the plan
 * allowance Cloud reports, and the most recent Cloud limit with its retry time.
 *
 * The facts come from `@elizaos/cloud-sdk/subscription-entitlement`
 * (`subscriptionSummary`, `serviceLimitNextChange`); this module only exposes
 * them to the app's own markup through `useCloudSubscriptionSummary`. It never
 * reads billing, buys anything or selects a price, quota or limit.
 *
 * Re-rendering is driven by the shown limit only: the surface updates when the
 * limit's wait ends or its reset passes, never as a per-second countdown.
 */
import {
  type ServiceLimit,
  type SubscriptionCopy,
  type SubscriptionSummary,
  type SubscriptionView,
  serviceLimitNextChange,
  subscriptionSummary,
} from "@elizaos/cloud-sdk/subscription-entitlement";
import { useEffect, useState } from "react";

/** A Cloud limit together with the time this app observed it. */
type ObservedServiceLimit = ServiceLimit & { observedAt: number };

interface CloudSubscriptionSummaryOptions {
  /** End of the plan window when known from another source (for example a redeemed grant). */
  planEndsAt?: number | null;
  /** The most recent Cloud refusal, if any. */
  lastLimit?: ObservedServiceLimit | null;
  /** Product names used in shared copy. */
  copy?: SubscriptionCopy;
}

/**
 * The shared subscription summary for `view`, recomputed when the shown limit
 * lapses or its reset passes so a stale retry time is not left on screen.
 */
export function useCloudSubscriptionSummary(
  view: SubscriptionView | null | undefined,
  options: CloudSubscriptionSummaryOptions = {},
): SubscriptionSummary {
  const { planEndsAt = null, lastLimit = null, copy } = options;
  const [, tick] = useState(0);
  const now = Date.now();
  const summary = subscriptionSummary(view ?? null, {
    planEndsAt,
    lastLimit,
    lastLimitAt: lastLimit?.observedAt ?? null,
    now,
    copy,
  });
  const nextChange =
    summary.limit && lastLimit
      ? serviceLimitNextChange(lastLimit, lastLimit.observedAt, now)
      : null;
  useEffect(() => {
    if (nextChange === null) return;
    const timer = setTimeout(() => tick((value) => value + 1), nextChange);
    return () => clearTimeout(timer);
  });
  return summary;
}
