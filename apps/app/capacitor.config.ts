// spec/app/platform/index.md, "Story: Reach the phone's native capabilities"
import { readFileSync } from "node:fs";
import type { CapacitorConfig } from "@capacitor/cli";

interface Hosted { readonly kind: "hosted"; readonly cloud: string; readonly appLinkHost: string }
interface DeploymentTable { readonly production: Omit<Hosted, "kind">; readonly staging: Omit<Hosted, "kind"> }

const table = JSON.parse(readFileSync(new URL("../../packages/deployment/deployments.json", import.meta.url), "utf8")) as DeploymentTable;

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

const acceptsQuery = (...keys: string[]) => keys.map((key) => ({ key, accepts: { kind: "any" as const } }));

// spec/cloud/index.md, "The table lists every route Alpha's screens and eliza's managed mail client send, each with the query keys they send"
const cloudRoutes = [
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
  { method: "POST", path: "/api/v1/maps/geocode" },
  { method: "POST", path: "/api/v1/maps/places/search" },
  { method: "POST", path: "/api/v1/maps/places/details" },
  { method: "POST", path: "/api/v1/maps/routes" },
  { method: "POST", path: "/api/v1/maps/tiles/viewport" },
  { method: "GET", path: "/api/v1/maps/tiles/{z}/{x}/{y}" },
  { method: "GET", path: "/api/v1/eliza/google/status", query: acceptsQuery("side", "grantId") },
  { method: "GET", path: "/api/v1/eliza/google/accounts", query: acceptsQuery("side") },
  { method: "POST", path: "/api/v1/eliza/google/connect/initiate" },
  { method: "POST", path: "/api/v1/eliza/google/disconnect" },
  { method: "GET", path: "/api/v1/eliza/google/gmail/search", query: acceptsQuery("side", "grantId", "query", "maxResults", "pageToken") },
  { method: "GET", path: "/api/v1/eliza/google/gmail/read", query: acceptsQuery("side", "grantId", "messageId") },
  { method: "GET", path: "/api/v1/eliza/google/gmail/inbox-v1/capabilities", query: acceptsQuery("grantId") },
  { method: "GET", path: "/api/v1/eliza/google/gmail/inbox-v1/thread", query: acceptsQuery("grantId", "threadId", "offset", "historyId") },
  { method: "GET", path: "/api/v1/eliza/google/gmail/inbox-v1/attachment", query: acceptsQuery("grantId", "messageId", "partId", "historyId") },
  { method: "GET", path: "/api/v1/eliza/google/gmail/inbox-v1/drafts", query: acceptsQuery("grantId", "pageToken") },
  { method: "GET", path: "/api/v1/eliza/google/gmail/inbox-v1/draft", query: acceptsQuery("grantId", "draftId") },
  { method: "POST", path: "/api/v1/eliza/google/gmail/inbox-v1/operations" },
  { method: "POST", path: "/api/v1/eliza/google/gmail/inbox-v1/operations/{requestId}/dispatch" },
  { method: "GET", path: "/api/v1/eliza/google/gmail/inbox-v1/operations/{requestId}", query: acceptsQuery("grantId") },
  { method: "GET", path: "/api/v1/eliza/google/calendar/calendars", query: acceptsQuery("grantId", "side") },
  { method: "GET", path: "/api/v1/eliza/google/calendar/feed", query: acceptsQuery("grantId", "side", "calendarId", "timeMin", "timeMax", "timeZone") },
  { method: "GET", path: "/api/v1/eliza/google/calendar/events/{eventId}", query: acceptsQuery("grantId", "calendarId") },
];

const config: CapacitorConfig = {
  appId: identity.appId,
  appName: identity.appName,
  webDir: androidPaths.web,
  loggingBehavior: "none",
  plugins: {
    ElizaSecureStore: {
      nativeOnly: ["device", "device-execution", "action-journal", "assistant-draft"],
      slots: [
        { pattern: "notes-draft:[1-9][0-9]*", access: "writable", limit: 256 * 1024 },
        { pattern: "notes-folders:[1-9][0-9]*", access: "writable", limit: 64 * 1024 },
        { pattern: "inbox-saved-bodies", access: "writable", limit: 2 * 1024 * 1024 },
        { pattern: "sms-draft:v2:(new|thread:[1-9][0-9]{0,18}|recipients:[0-9a-f]{64})", access: "exchangeable", limit: 2 * 1024 * 1024 },
        { pattern: "sms-outgoing:v2:device", access: "exchangeable", limit: 64 * 1024 },
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
  android: { path: androidPaths.project, allowMixedContent: false, webContentsDebuggingEnabled: false },
};

export default config;
