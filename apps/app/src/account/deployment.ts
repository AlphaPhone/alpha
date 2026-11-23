// spec/account/session.md, "The build addresses one deployment, and staging only with test mocks or the Cloud resident's browser preview"; spec/account/google.md, "Google's consent page is the only page consent opens"
import type { ConsentPage } from "../../gen/account__google.ts";
import type { Deployment, Environment } from "../../gen/account__session.ts";
import { alphaCloud, alphaCloudCutover, elizaCloud, type CloudAuthority as PlatformAuthority } from "../platform/build-flags.ts";

/** The public identity of one Cloud environment, with the agents host its Google callbacks may name: never a credential. */
export interface CloudAuthority extends PlatformAuthority {
  readonly agents: string;
}

const clouds = { ElizaCloud: elizaCloud, AlphaCloud: alphaCloud } as const;

const agentHosts: Record<Deployment, Record<Environment, string>> = {
  ElizaCloud: { Production: "cloud.eliza.app", Staging: "cloud-staging.eliza.app" },
  AlphaCloud: { Production: "cloud.alphacompute.ai", Staging: "cloud-staging.alphacompute.ai" },
};

/** The deployment this build addresses: Alpha Cloud only once the platform's cutover flag is set, Eliza Cloud otherwise. */
export const deployment: Deployment = alphaCloudCutover ? "AlphaCloud" : "ElizaCloud";

/** The public authority of a deployment's environment. */
export function authorityOf(of: Deployment, environment: Environment): CloudAuthority {
  const cloud = clouds[of];
  return { ...(environment === "Staging" ? cloud.staging : cloud.production), agents: agentHosts[of][environment] };
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

export { newId as freshKey } from "../platform/ids.ts";

/** The native secure slot that keeps one account's pending Cloud delegation. */
export async function delegationSlot(owner: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(owner));
  return `cloud-delegation:v1:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
