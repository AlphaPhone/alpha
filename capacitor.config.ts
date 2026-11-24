// spec/account/signIn.md; spec/platform/index.md, "A capability is offered only on a variant whose build registers its plugin"
import fs from "node:fs";
import type { CapacitorConfig } from "@capacitor/cli";
import {androidIdentity} from './scripts/android-identity.ts';

type Deployment = {
  signIn: { callbackPath: string };
  shipped: Record<"production" | "staging", { api: string; web: string }>;
};

const identity = androidIdentity();
const deployment = JSON.parse(fs.readFileSync(new URL("./cloud/deployment.json", import.meta.url), "utf8")) as Deployment;
const testMocks = process.env.ELIZA_DEV_ALLOW_TEST_MOCKS === "1";

/** One Cloud the native sign-in registers: its API origin, the verified App Link host and the callback path Android returns through. */
function environment(name: "production" | "staging") {
  const cloud = deployment.shipped[name];
  return { name, apiOrigin: cloud.api, appLinkHost: new URL(cloud.web).host, redirectPath: deployment.signIn.callbackPath };
}

const any = { kind: "any" } as const;
/** Query rules that accept any value for each named key. */
const keys = (...names: string[]) => names.map((key) => ({ key, accepts: any }));
const google = "/api/v1/eliza/google";
const inbox = `${google}/gmail/inbox-v1`;

/**
 * The Cloud device routes the renderer sends through ElizaCloud. Each one is, by method and path, exactly one route of
 * the os sign-in module's device table (CloudRequestPolicy.deviceRoutes), and none is sign-in-owned (/api/public,
 * /api/v1/auth, /api/v1/app-auth, /api/v1/api-keys, /api/v1/voice/speech): one such route refuses the whole table
 * (spec/os/signIn/cloudRequests.md, lawOneForeignRouteRefusesTheTable). The service document and self-revocation go
 * through the sign-in owner, AlphaCloudSignIn. test/cloud-route-table.test.mjs loads this table through upstream's
 * policy. The Gmail routes and their query keys are the ones @elizaos/plugin-inbox's managed client sends.
 */
export const cloudRoutes = [
  { method: "GET", path: "/api/v1/user" },
  { method: "GET", path: "/api/v1/referrals" },
  { method: "POST", path: "/api/v1/referrals/apply" },
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
  { method: "GET", path: `${google}/status`, query: keys("side", "grantId") },
  { method: "GET", path: `${google}/accounts`, query: keys("side") },
  { method: "POST", path: `${google}/connect/initiate` },
  { method: "POST", path: `${google}/disconnect` },
  { method: "GET", path: `${google}/gmail/search`, query: keys("side", "grantId", "query", "maxResults", "pageToken") },
  { method: "GET", path: `${google}/gmail/read`, query: keys("side", "grantId", "messageId") },
  { method: "GET", path: `${inbox}/capabilities`, query: keys("grantId") },
  { method: "GET", path: `${inbox}/thread`, query: keys("grantId", "threadId", "offset", "historyId") },
  { method: "GET", path: `${inbox}/attachment`, query: keys("grantId", "messageId", "partId", "historyId") },
  { method: "GET", path: `${inbox}/drafts`, query: keys("grantId", "pageToken") },
  { method: "GET", path: `${inbox}/draft`, query: keys("grantId", "draftId") },
  { method: "POST", path: `${inbox}/operations` },
  { method: "POST", path: `${inbox}/operations/{requestId}/dispatch` },
  { method: "GET", path: `${inbox}/operations/{requestId}`, query: keys("grantId") },
  { method: "GET", path: `${google}/calendar/calendars`, query: keys("grantId", "side") },
  { method: "GET", path: `${google}/calendar/feed`, query: keys("grantId", "side", "calendarId", "timeMin", "timeMax", "timeZone") },
  { method: "GET", path: `${google}/calendar/events/{eventId}`, query: keys("grantId", "calendarId") },
];

const config: CapacitorConfig = {
  appId: identity.appId,
  appName: identity.appName,
  webDir: "web-dist",
  loggingBehavior: "none",
  plugins: {
    SystemBars: { style: "LIGHT", insetsHandling: "disable" },
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
  android: { path: "android", allowMixedContent: false },
};
export default config;
