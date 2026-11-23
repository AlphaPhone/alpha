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

/** The Cloud device routes the renderer sends through ElizaCloud; every one is a device route the os sign-in module lists. */
const cloudRoutes = [
  { method: "GET", path: "/api/public/service" },
  { method: "GET", path: "/api/v1/user" },
  { method: "GET", path: "/api/v1/referrals" },
  { method: "POST", path: "/api/v1/referrals/apply" },
  { method: "DELETE", path: "/api/v1/api-keys/current" },
  { method: "GET", path: "/api/v1/subscriptions/plans" },
  { method: "POST", path: "/api/v1/subscriptions/checkout/confirm" },
  { method: "GET", path: "/api/v1/subscription/entitlement" },
  { method: "GET", path: "/api/v1/subscription/entitlement-keys" },
  { method: "GET", path: "/api/v1/billing/limits" },
  { method: "GET", path: "/api/v1/billing/invoices" },
  { method: "GET", path: "/api/v1/billing/invoices/{invoiceId}" },
  { method: "GET", path: "/api/v1/maps/capabilities" },
  { method: "POST", path: "/api/v1/maps/tiles/viewport" },
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
