/**
 * Owner-facing presentation of an Eliza Cloud subscription: the plan
 * description, allowance line, plan action labels, Cloud refusal and
 * redemption copy, retry times and the account panel summary.
 *
 * Every fact shown comes from verified Cloud data: the plan view, entitlement
 * verification, admission, refusal parsing and the redemption error stay in
 * the shared entitlement client (`@elizaos/cloud-sdk/subscription-entitlement`),
 * which this module only reads. It never chooses a price, quota, allowance or
 * limit, and nothing here buys, upgrades or retries anything. Hosts supply the
 * product names used in copy (`SubscriptionCopy`).
 */
import {
  type PlanAdmission,
  type PlanAllowance,
  planAdmission,
  type RedeemResult,
  type ServiceLimit,
  SubscriptionRedeemError,
  type SubscriptionView,
} from "@elizaos/cloud-sdk/subscription-entitlement";

/**
 * Names used in owner-facing copy. `serviceName` is the deployment's public
 * name (for example "Eliza Cloud"); `productName` is the application the
 * owner is using; `deviceNoun` names the device that keeps local data
 * ("phone"). None of them changes any decision.
 */
export interface SubscriptionCopy {
  serviceName?: string;
  productName?: string;
  deviceNoun?: string;
}
const serviceNameOf = (copy: SubscriptionCopy | undefined) =>
  copy?.serviceName ?? "Cloud";
const productNameOf = (copy: SubscriptionCopy | undefined) =>
  copy?.productName ?? "This app";
const deviceNounOf = (copy: SubscriptionCopy | undefined) =>
  copy?.deviceNoun ?? "device";

function clock(at: number): string {
  try {
    return new Date(at).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return new Date(at).toISOString();
  }
}
export function allowanceText(
  allowance: PlanAllowance | null,
  now: number = Date.now(),
  copy?: SubscriptionCopy,
): string {
  const serviceName = serviceNameOf(copy);
  if (!allowance) return `Plan allowance details are in ${serviceName}.`;
  if (allowance.unit === "usd_micros") {
    // Rounded down, so the client never shows more than Cloud reports.
    const reset =
      allowance.resetsAt > now ? ` Resets ${clock(allowance.resetsAt)}.` : "";
    if (allowance.remaining === 0)
      return `This billing period's plan allowance is used up.${reset}`;
    const percent = Math.floor((allowance.remaining * 100) / allowance.granted);
    return `${percent < 1 ? "Less than 1%" : `${percent}%`} of this billing period's plan allowance is left.${reset}`;
  }
  const per = `this ${allowance.period}`;
  const reset =
    allowance.resetsAt === null ? "" : ` Resets ${clock(allowance.resetsAt)}.`;
  if (allowance.limit !== null && allowance.used !== null)
    return `${Math.min(allowance.used, allowance.limit).toLocaleString()} of ${allowance.limit.toLocaleString()} ${allowance.unit} used ${per}.${reset}`;
  if (allowance.limit !== null)
    return `Allowance: ${allowance.limit.toLocaleString()} ${allowance.unit} per ${allowance.period}.${reset}`;
  if (allowance.used !== null)
    return `${allowance.used.toLocaleString()} ${allowance.unit} used ${per}.${reset}`;
  return `Plan allowance details are in ${serviceName}.${reset}`;
}
const LOCAL_KEEPS_WORKING = "Local apps keep working.";
export const MANAGE_PLAN_LABEL = "Manage plan";
export const CHOOSE_PLAN_LABEL = "Choose a plan";
export interface SubscriptionDescription {
  headline: string;
  detail: string;
  manage: boolean;
  manageLabel: string;
}
export function describeSubscription(
  view: SubscriptionView | null | undefined,
  copy?: SubscriptionCopy,
): SubscriptionDescription {
  const serviceName = serviceNameOf(copy);
  const manageLabel = `Manage plan in ${serviceName}`;
  if (!view || view.kind === "checking")
    return {
      headline: "Checking your plan…",
      detail: "",
      manage: false,
      manageLabel,
    };
  switch (view.kind) {
    case "credits":
      return {
        headline: `${serviceName} credits`,
        detail: `Uses your ${serviceName} account balance.`,
        manage: true,
        manageLabel: `Manage billing in ${serviceName}`,
      };
    case "active":
      return {
        headline:
          view.status === "past_due"
            ? `${view.planName} · payment due`
            : view.status === "trialing"
              ? `${view.planName} · trial`
              : view.planName,
        detail: [
          view.source === "billing-limits"
            ? ""
            : allowanceText(view.allowance, Date.now(), copy),
          view.status === "past_due"
            ? `Payment is past due. Update payment in ${serviceName} to keep AI available.`
            : "",
          view.refreshFailed
            ? `Plan status could not be refreshed; ${serviceName} still decides each AI request.`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
        manage: view.status === "past_due",
        manageLabel,
      };
    case "inactive":
      return {
        headline:
          view.status === "canceled"
            ? `${view.planName ?? "Your plan"} has ended`
            : "No active plan",
        detail: `${productNameOf(copy)} needs an active ${serviceName} plan. Redeem a subscription code or choose a plan in ${serviceName}. Nothing is purchased automatically, and your data on this ${deviceNounOf(copy)} is kept.`,
        manage: true,
        manageLabel: CHOOSE_PLAN_LABEL,
      };
    case "expired":
      return {
        headline: view.planName,
        detail: `Plan status is out of date and could not be refreshed. ${serviceName} still decides each AI request. ${LOCAL_KEEPS_WORKING}`,
        manage: false,
        manageLabel,
      };
    case "unavailable":
      return {
        headline: "Plan status unavailable",
        detail:
          view.reason === "not-published"
            ? `${serviceName} did not report a plan for this account. Check again, redeem a subscription code or choose a plan. Your data on this ${deviceNounOf(copy)} is kept.`
            : `Plan status could not be checked right now. ${serviceName} still decides each AI request. ${LOCAL_KEEPS_WORKING}`,
        manage: false,
        manageLabel,
      };
  }
}

export function retryDuration(ms: number): string {
  const secs = Math.max(1, Math.ceil(ms / 1000));
  if (secs < 90) return `about ${secs} second${secs === 1 ? "" : "s"}`;
  const minutes = Math.ceil(secs / 60);
  if (minutes < 90) return `about ${minutes} minutes`;
  return `about ${Math.ceil(minutes / 60)} hours`;
}
/** Owner-facing copy for a refusal. Nothing is retried, purchased or upgraded automatically. */
export function serviceLimitMessage(
  limit: ServiceLimit | null,
  now: number = Date.now(),
  copy?: SubscriptionCopy,
): string {
  const serviceName = serviceNameOf(copy),
    productName = productNameOf(copy);
  if (!limit || limit.kind === "rate-limited") {
    const wait =
      limit?.retryAfterMs != null
        ? `Try again in ${retryDuration(limit.retryAfterMs)}.`
        : limit?.resetsAt != null && limit.resetsAt > now
          ? `Try again in ${retryDuration(limit.resetsAt - now)}.`
          : "Wait a moment before sending again.";
    return `The AI request rate limit was reached. ${wait} ${productName} did not retry your message.`;
  }
  if (limit.kind === "allowance-exhausted") {
    const reset =
      limit.resetsAt != null && limit.resetsAt > now
        ? ` It resets ${clock(limit.resetsAt)}.`
        : limit.retryAfterMs != null
          ? ` It resets in ${retryDuration(limit.retryAfterMs)}.`
          : "";
    return `Your plan's AI allowance for this period is used up.${reset} Nothing is purchased automatically. ${LOCAL_KEEPS_WORKING}`;
  }
  // A structured period reset from the agent or Cloud is shown; without one the copy is unchanged.
  if (limit.kind === "billing-refused")
    return `${serviceName} declined this AI request for your account's billing.${limit.resetsAt != null && limit.resetsAt > now ? ` ${serviceName} reports your plan allowance resets ${clock(limit.resetsAt)}.` : ""} Check your account in Settings. ${productName} did not retry your message, and nothing is purchased automatically. ${LOCAL_KEEPS_WORKING}`;
  return `AI needs an active ${serviceName} plan. Manage your plan in ${serviceName}. Nothing is purchased automatically. ${LOCAL_KEEPS_WORKING}`;
}

/** Owner-facing redemption copy. Unknown, expired, disabled and used-up codes share one answer. */
export function redeemFailureMessage(
  error: unknown,
  copy?: SubscriptionCopy,
): string {
  const serviceName = serviceNameOf(copy);
  if (error instanceof SubscriptionRedeemError) {
    if (error.code === "invalid")
      return "This code could not be redeemed. Check the code and try again.";
    if (error.code === "already-redeemed")
      return "This account has already received this subscription. Check your plan again.";
    if (error.code === "paid-plan-active")
      return "This account already has a paid plan, so this code cannot be added to it. Nothing was changed.";
    if (error.code === "ended")
      return "The subscription from this code has ended for this account. Check your plan again.";
    if (error.code === "rate-limited")
      return `Too many attempts. Try again in ${retryDuration(error.retryAfterMs ?? 60_000)}.`;
    if (error.code === "account")
      return `${serviceName} could not apply a code to this account. Check the account in ${serviceName}.`;
  }
  return "The code could not be redeemed right now. Try again.";
}
export function redeemSuccessMessage(result: RedeemResult): string {
  const until =
    result.grantEndsAt === null
      ? ""
      : ` It runs until ${new Date(result.grantEndsAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}.`;
  if (result.paidPlanTakesPrecedence)
    return `Code redeemed. Your current paid plan stays in effect; the code applies if that plan ends.${until}`;
  return `Code redeemed${result.planName ? ` for ${result.planName}` : ""}.${until}`;
}

/**
 * One account panel's plan facts, for the shared settings/account surface.
 * Every value comes from the view, a verified entitlement or a Cloud refusal.
 */
export interface SubscriptionSummary extends SubscriptionDescription {
  /** The plan's allowance line, when Cloud reported one for an active signed plan. */
  allowance: string | null;
  /** End of the plan window when Cloud reported it. */
  planEndsAt: number | null;
  /** Copy for the most recent Cloud refusal that still applies, with its retry time. */
  limit: string | null;
  /** The admission decision for this view. */
  admission: PlanAdmission;
}
export function subscriptionSummary(
  view: SubscriptionView | null | undefined,
  options: {
    planEndsAt?: number | null;
    lastLimit?: ServiceLimit | null;
    /** When the last limit was observed; a countdown that has passed is not shown. */
    lastLimitAt?: number | null;
    now?: number;
    copy?: SubscriptionCopy;
  } = {},
): SubscriptionSummary {
  const now = options.now ?? Date.now();
  const description = describeSubscription(view, options.copy);
  const allowance =
    view?.kind === "active" &&
    view.source !== "billing-limits" &&
    view.allowance
      ? allowanceText(view.allowance, now, options.copy)
      : null;
  const planEndsAt =
    options.planEndsAt ??
    (view?.kind === "active"
      ? (view.planEndsAt ??
        (view.source === "billing-limits" && view.expiresAt > 0
          ? view.expiresAt
          : null))
      : null);
  const limit = options.lastLimit ?? null;
  const observedAt = options.lastLimitAt ?? now;
  const elapsed = Math.max(0, now - observedAt);
  // A rate-limit wait that has passed no longer applies; a reset still in the future does.
  const current =
    limit &&
    ((limit.retryAfterMs !== null && limit.retryAfterMs > elapsed) ||
      (limit.resetsAt !== null && limit.resetsAt > now) ||
      (limit.retryAfterMs === null &&
        limit.resetsAt === null &&
        elapsed < 60_000))
      ? {
          ...limit,
          // Only the part of the wait still ahead is shown. A countdown that
          // has run out leaves the reset (when one is still ahead) to say when.
          retryAfterMs:
            limit.retryAfterMs === null || limit.retryAfterMs <= elapsed
              ? null
              : limit.retryAfterMs - elapsed,
        }
      : null;
  return {
    ...description,
    allowance,
    planEndsAt,
    limit: current ? serviceLimitMessage(current, now, options.copy) : null,
    admission: planAdmission(view),
  };
}

/**
 * Milliseconds until the summary line for a shown Cloud limit changes or
 * lapses: its wait ends, its reset passes, or (with neither) the one-minute
 * notice window closes. Bounded to between one second and one hour so a
 * surface re-renders at those moments only, never as a per-second countdown.
 * Null when nothing about the limit is still ahead.
 */
export function serviceLimitNextChange(
  limit: ServiceLimit,
  observedAt: number,
  now: number = Date.now(),
): number | null {
  const points = [
    limit.retryAfterMs !== null ? observedAt + limit.retryAfterMs : null,
    limit.resetsAt,
    limit.retryAfterMs === null && limit.resetsAt === null
      ? observedAt + 60_000
      : null,
  ].filter((at): at is number => at !== null && at > now);
  return points.length
    ? Math.min(3_600_000, Math.max(1000, Math.min(...points) - now))
    : null;
}
