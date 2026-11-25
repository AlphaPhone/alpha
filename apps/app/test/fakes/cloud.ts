// spec/kit/read.md, "Story: Read from outside"
import type { Account, BillingSnapshot, PlanOffer } from "@elizaos/cloud";
import { busy, spent } from "./platform.ts";
import { readJsonBody, type Route } from "./routes.ts";

/** The owner's account as eliza's cloud answers `GET /api/v1/user`: typed by eliza's own client, so a change of its shape stops this compiling. */
export const account: Account = { id: "user-1", email: "owner@alpha.test", phone: "", name: "owner", organization_id: "org-1", organization: { id: "org-1", name: "owner" } };

export interface CheckoutScene {
  readonly starts: Array<{ planKey: string; presentation: string; key: string }>;
  readonly confirmations: string[];
  readonly opened: string[];
  returned: string | null;
  paid: boolean;
}

export const checkoutSession = "cs_test_alphacheckout";
export const checkoutUrl = "https://checkout.stripe.com/c/pay/" + checkoutSession;
const checkoutReply = { commandId: "cmd_alpha_checkout", sessionId: checkoutSession, checkoutUrl, status: "open" } as const;

const limits = (observedAt: number, checkout?: CheckoutScene): BillingSnapshot => ({
  schemaVersion: 3,
  observedAt,
  account: { status: "active" },
  balance: { usdMicros: checkout === undefined ? 12_500_000 : 0, revision: 1 },
  plan: checkout?.paid ? { key: "plus_monthly", source: "subscription", effectiveUntil: observedAt + 86_400_000 } : { key: "free", source: "free", effectiveUntil: null },
  subscription: checkout?.paid ? {
    id: "sub_alpha_checkout", planKey: "plus_monthly", status: "active", periodStart: observedAt,
    periodEnd: observedAt + 86_400_000, cancelAtPeriodEnd: false, pendingPlanKey: null, dunningEndsAt: null,
    revision: 2, control: { action: "cancel", eligible: true, expectedSubscriptionRevision: 2 },
  } : null,
  grant: null,
  allowance: null,
  funding: { inference: "creditsOnly", speech: "creditsOnly", maps: "creditsOnly" },
});

const plans: readonly PlanOffer[] = [
  { key: "pro_monthly", name: "Pro", amountCents: 4900, currency: "usd", interval: "month", allowance: { amountUsd: "40" } },
  { key: "plus_monthly", name: "Plus", amountCents: 1950, currency: "usd", interval: "month", allowance: { amountUsd: "16" } },
];

/** What the fake cloud answers for the platform itself; an area adds its own routes beside it in scene.ts. */
export function cloudRoutes(signedIn: () => boolean, now: () => number, checkout?: CheckoutScene): Route[] {
  return [
    (request, url) => {
      if (request.method !== "GET" || url.pathname !== "/api/v1/user") return undefined;
      return signedIn() ? Response.json({ success: true, data: account }) : new Response(null, { status: 401 });
    },
    (request, url) => {
      if (request.method !== "GET" || url.pathname !== "/api/v1/billing/limits") return undefined;
      return signedIn() ? Response.json({ success: true, data: limits(now(), checkout) }) : new Response(null, { status: 401 });
    },
    (request, url) => {
      if (checkout === undefined || request.method !== "POST") return undefined;
      if (url.pathname === "/api/v1/subscriptions/checkout") return (async () => {
        const { planKey, presentation, idempotencyKey } = await readJsonBody(request);
        if ((planKey !== "plus_monthly" && planKey !== "pro_monthly") || presentation !== "mobile"
          || typeof idempotencyKey !== "string" || !idempotencyKey) return new Response(null, { status: 400 });
        checkout.starts.push({ planKey, presentation, key: idempotencyKey });
        return Response.json({ ...checkoutReply, expiresAt: now() + 60_000 });
      })();
      if (url.pathname === "/api/v1/subscriptions/checkout/confirm") return (async () => {
        const { sessionId } = await readJsonBody(request);
        if (typeof sessionId !== "string") return new Response(null, { status: 400 });
        checkout.confirmations.push(sessionId);
        if (sessionId !== checkoutSession) return new Response(null, { status: 404 });
        return Response.json(checkout.paid ? { commandId: checkoutReply.commandId, status: "completed" } : { ...checkoutReply, expiresAt: now() + 60_000 });
      })();
      return undefined;
    },
    (request, url) => (request.method === "GET" && url.pathname === "/api/v1/subscriptions/plans" ? Response.json({ plans }) : undefined),
    (request, url) => (request.method === "GET" && url.pathname === "/api/v1/platform/busy" ? busy(Number(url.searchParams.get("status"))) : undefined),
    (request, url) => (request.method === "GET" && url.pathname === "/api/v1/platform/spent" ? spent(Number(url.searchParams.get("until"))) : undefined),
  ];
}
