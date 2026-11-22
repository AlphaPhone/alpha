// spec/account/session.md, "The build addresses one deployment, and staging only with test mocks"; spec/account/google.md, "Google's consent page is the only page consent opens"
import type { ConsentPage } from "../../gen/account__google.ts";
import type { Deployment, Environment } from "../../gen/account__session.ts";

/** The public identity of one Cloud environment: never a credential. */
export interface CloudAuthority {
  readonly name: string;
  readonly api: string;
  readonly web: string;
  readonly agents: string;
  readonly entitlementAudience: string;
}

const authorities: Record<Deployment, Record<Environment, CloudAuthority>> = {
  ElizaCloud: {
    Production: { name: "Eliza Cloud", api: "https://api.eliza.app", web: "https://eliza.app", agents: "cloud.eliza.app", entitlementAudience: "eliza-alpha-phone" },
    Staging: { name: "Eliza Cloud", api: "https://api-staging.eliza.app", web: "https://staging.eliza.app", agents: "cloud-staging.eliza.app", entitlementAudience: "eliza-alpha-phone" },
  },
  AlphaCloud: {
    Production: { name: "Alpha Cloud", api: "https://api.alphacompute.ai", web: "https://cloud.alphacompute.ai", agents: "cloud.alphacompute.ai", entitlementAudience: "ai.alphacompute.alphaphone" },
    Staging: { name: "Alpha Cloud", api: "https://api-staging.alphacompute.ai", web: "https://cloud-staging.alphacompute.ai", agents: "cloud-staging.alphacompute.ai", entitlementAudience: "ai.alphacompute.alphaphone" },
  },
};

/** `ALPHA_CLOUD_CUTOVER`: Alpha Cloud instead of the shipped Eliza Cloud. Off unless the build sets `VITE_ALPHA_CLOUD_CUTOVER=1`. */
export const deployment: Deployment = import.meta.env?.VITE_ALPHA_CLOUD_CUTOVER === "1" ? "AlphaCloud" : "ElizaCloud";

/** The environment a build addresses: staging only when test mocks allow it and the build asks for it. */
export function environmentFor(testMocks: boolean): Environment {
  return testMocks && import.meta.env?.VITE_ALPHA_CLOUD_ENVIRONMENT === "staging" ? "Staging" : "Production";
}

/** The public authority of a deployment's environment. */
export function authorityOf(of: Deployment, environment: Environment): CloudAuthority {
  return authorities[of][environment];
}

/** The native host's name for an environment. */
export function hostEnvironment(environment: Environment): "production" | "staging" {
  return environment === "Staging" ? "staging" : "production";
}

/** The registered App Link a Stripe page returns to. */
export function billingReturnUrl(authority: CloudAuthority): string {
  return `${authority.web}/alphaphone/billing/return`;
}

/** Whether a payment page Cloud answered is Stripe's own checkout or invoice page, and nothing else. */
export function stripePageAllowed(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const page = new URL(value);
  return page.protocol === "https:" && !page.username && !page.password && !page.port && (page.hostname === "checkout.stripe.com" || page.hostname === "invoice.stripe.com");
}

const googleScopes = new Set([
  "openid", "email", "profile", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.modify", "https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/calendar.events",
]);

/** What spec/account/google.md checks of a consent URL Cloud answered. */
export function consentPageOf(value: string, authority: CloudAuthority): ConsentPage {
  if (!URL.canParse(value)) return { googleOrigin: false, callbackListed: false, scopesListed: false, carriesCredentials: true };
  const url = new URL(value);
  const params = url.searchParams;
  const callback = URL.canParse(params.get("redirect_uri") ?? "") ? new URL(params.get("redirect_uri") ?? "") : undefined;
  const callbacks = [authority.api, authority.web, `https://${authority.agents}`];
  const scopes = (params.get("scope") ?? "").split(/\s+/).filter(Boolean);
  return {
    googleOrigin: url.origin === "https://accounts.google.com" && ["/o/oauth2/v2/auth", "/o/oauth2/auth"].includes(url.pathname) && params.get("response_type") === "code" && !!params.get("state"),
    callbackListed: callback !== undefined && callbacks.includes(callback.origin) && callback.pathname === "/api/v1/oauth/google/callback" && !callback.search,
    scopesListed: scopes.length > 0 && scopes.every((scope) => googleScopes.has(scope)),
    carriesCredentials: !!url.username || !!url.password || !!url.hash || !!url.port,
  };
}

/** The workspace return App Link for Google consent started from Alpha. */
export function googleWorkspaceCallback(authority: CloudAuthority): string {
  return `${authority.web}/alphaphone/gmail/callback`;
}

/** A fresh idempotency key or request id. */
export function freshKey(): string {
  return crypto.randomUUID();
}

/** The native secure slot that keeps one account's pending Cloud delegation. */
export async function delegationSlot(owner: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(owner));
  return `cloud-delegation:v1:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
