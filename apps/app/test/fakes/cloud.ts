// spec/kit/read.md, "Story: Read from outside"
import type { Account, BillingSnapshot } from "@elizaos/cloud";
import { busy } from "./platform.ts";
import type { Route } from "./routes.ts";

/** The owner's account as eliza's cloud answers `GET /api/v1/user`: typed by eliza's own client, so a change of its shape stops this compiling. */
export const account: Account = { id: "user-1", email: "owner@alpha.test", phone: null, name: "owner", organization_id: "org-1", organization: { id: "org-1", name: "owner" } };

const limits = (observedAt: number): BillingSnapshot => ({
  schemaVersion: 3,
  observedAt,
  account: { status: "active" },
  balance: { usdMicros: 12_500_000, revision: 1 },
  plan: { key: "free", source: "free", effectiveUntil: null },
  subscription: null,
  grant: null,
  allowance: null,
  funding: { inference: "creditsOnly", speech: "creditsOnly", maps: "creditsOnly" },
});

/** What the fake cloud answers for the platform itself; an area adds its own routes beside it in scene.ts. */
export function cloudRoutes(signedIn: () => boolean, now: () => number): Route[] {
  return [
    (request, url) => {
      if (request.method !== "GET" || url.pathname !== "/api/v1/user") return undefined;
      return signedIn() ? Response.json({ success: true, data: account }) : new Response(null, { status: 401 });
    },
    (request, url) => {
      if (request.method !== "GET" || url.pathname !== "/api/v1/billing/limits") return undefined;
      return signedIn() ? Response.json({ success: true, data: limits(now()) }) : new Response(null, { status: 401 });
    },
    (request, url) => (request.method === "GET" && url.pathname === "/api/v1/platform/busy" ? busy(Number(url.searchParams.get("status"))) : undefined),
  ];
}
