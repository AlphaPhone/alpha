// spec/app/platform/index.md, "Story: Reach the phone's native capabilities"
import type { CapacitorConfig } from "@capacitor/cli";
import table from "../../packages/deployment/deployments.json" with { type: "json" };

interface Hosted { readonly kind: "hosted"; readonly cloud: string; readonly appLinkHost: string }

const deployments: Record<"production" | "staging", Hosted> = { production: { ...table.production, kind: "hosted" }, staging: { ...table.staging, kind: "hosted" } };

export const identity = { appId: "ai.alphacompute.alphaphone", appName: "Alpha Phone" } as const;
export const androidPaths = { project: "android", web: "dist" } as const;
export const signInCallbackPath = "/alphaphone/auth/callback";
export const production = deployments.production;

const testMocks = process.env.ELIZA_DEV_ALLOW_TEST_MOCKS === "1";

function environment(name: "production" | "staging") {
  const row = deployments[name];
  return { name, apiOrigin: row.cloud, appLinkHost: row.appLinkHost, redirectPath: signInCallbackPath };
}

const any = { kind: "any" } as const;

const cloudRoutes = [
  { method: "GET", path: "/api/public/service" },
  { method: "GET", path: "/api/v1/user" },
  { method: "GET", path: "/api/v1/referrals" },
  { method: "POST", path: "/api/v1/referrals/apply" },
  { method: "DELETE", path: "/api/v1/api-keys/current" },
  { method: "GET", path: "/api/v1/subscriptions/plans" },
  { method: "POST", path: "/api/v1/subscriptions/checkout" },
  { method: "POST", path: "/api/v1/subscriptions/checkout/confirm" },
  { method: "POST", path: "/api/v1/subscription/redeem" },
  { method: "GET", path: "/api/v1/subscription/entitlement" },
  { method: "GET", path: "/api/v1/subscription/entitlement-keys" },
  { method: "GET", path: "/api/v1/billing/limits" },
  { method: "GET", path: "/api/v1/billing/invoices" },
  { method: "GET", path: "/api/v1/billing/invoices/{invoiceId}" },
  { method: "GET", path: "/api/v1/maps/capabilities" },
  { method: "POST", path: "/api/v1/maps/places/search" },
  { method: "POST", path: "/api/v1/maps/places/details" },
  { method: "POST", path: "/api/v1/maps/routes" },
  { method: "POST", path: "/api/v1/maps/tiles/viewport" },
  { method: "GET", path: "/api/v1/maps/tiles/{z}/{x}/{y}" },
  { method: "GET", path: "/api/v1/eliza/google/status" },
  { method: "GET", path: "/api/v1/eliza/google/accounts", query: [{ key: "side", accepts: any }] },
  { method: "POST", path: "/api/v1/eliza/google/connect/initiate" },
  { method: "POST", path: "/api/v1/eliza/google/disconnect" },
  { method: "GET", path: "/api/v1/eliza/google/calendar/calendars", query: [{ key: "grantId", accepts: any }, { key: "side", accepts: any }] },
  { method: "GET", path: "/api/v1/eliza/google/calendar/feed", query: ["grantId", "side", "calendarId", "timeMin", "timeMax", "timeZone"].map((key) => ({ key, accepts: any })) },
  { method: "GET", path: "/api/v1/eliza/google/calendar/events/{eventId}", query: [{ key: "grantId", accepts: any }, { key: "calendarId", accepts: any }] },
];

const config: CapacitorConfig = {
  appId: identity.appId,
  appName: identity.appName,
  webDir: androidPaths.web,
  loggingBehavior: "none",
  plugins: {
    ElizaSecureStore: {
      slots: [
        { pattern: "notes-draft:[1-9][0-9]*", access: "writable", limit: 256 * 1024 },
        { pattern: "notes-folders:[1-9][0-9]*", access: "writable", limit: 64 * 1024 },
      ],
    },
    ElizaSignIn: {
      clientId: identity.appId,
      googleMode: "browser",
      testEnvironments: testMocks,
      environments: testMocks ? [environment("production"), environment("staging")] : [environment("production")],
    },
    ElizaCloud: {
      routes: [{ prefixes: ["/api"], id: "[A-Za-z0-9][A-Za-z0-9._:@+-]{0,511}", routes: cloudRoutes }],
    },
  },
  server: { androidScheme: "https" },
  android: { path: androidPaths.project, allowMixedContent: false },
};

export default config;
