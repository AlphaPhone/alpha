// spec/account/session.md, "The build addresses one deployment, and staging only with test mocks or the Cloud resident's browser preview"; spec/account/google.md, "Google's consent page is the only page consent opens"; spec/account/billing.md, "A payment page opens only on a Stripe host the phone's link policy opens"
import { paymentPageOpens } from "../../gen/account__billing.ts";
import type { ConsentPage } from "../../gen/account__google.ts";
import type { Deployment, Environment } from "../../gen/account__session.ts";
import deploymentText from "../../../../cloud/deployment.json?raw";
import { alphaCloud, alphaCloudCutover, elizaCloud, type CloudAuthority as PlatformAuthority } from "../platform/build-flags.ts";

/** The public identity of one Cloud environment, with the agents host its Google callbacks may name: never a credential. */
export interface CloudAuthority extends PlatformAuthority {
  readonly agents: string;
}

const clouds = { ElizaCloud: elizaCloud, AlphaCloud: alphaCloud } as const;

const published: unknown = JSON.parse(deploymentText);

function returnPath(name: "billingReturnPath" | "connectReturnPath"): string {
  const signIn = typeof published === "object" && published !== null ? (published as Record<string, unknown>).signIn : undefined;
  const path = typeof signIn === "object" && signIn !== null ? (signIn as Record<string, unknown>)[name] : undefined;
  if (typeof path !== "string" || !/^\/[A-Za-z0-9/_-]+$/.test(path)) throw new Error(`cloud/deployment.json has no signIn.${name}`);
  return path;
}

const billingReturnPath = returnPath("billingReturnPath");
const connectReturnPath = returnPath("connectReturnPath");

/** The deployment this build addresses: Alpha Cloud only once the platform's cutover flag is set, Eliza Cloud otherwise. */
export const deployment: Deployment = alphaCloudCutover ? "AlphaCloud" : "ElizaCloud";

/** The public authority of a deployment's environment as the platform reads it from cloud/deployment.json, with its agents host: the host of its hosted services origin. @throws {never} */
export function authorityOf(of: Deployment, environment: Environment): CloudAuthority {
  const cloud = environment === "Staging" ? clouds[of].staging : clouds[of].production;
  return { ...cloud, agents: new URL(cloud.services).host };
}

/** The registered App Link a Stripe page returns to. */
export function billingReturnUrl(authority: CloudAuthority): string {
  return `${authority.web}${billingReturnPath}`;
}

/** Whether a payment page Cloud answered is one the phone's external-link policy opens: a plain HTTPS page on a Stripe host spec/account/billing.md lists, and nothing else. @throws {never} */
export function stripePageAllowed(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const page = new URL(value);
  return paymentPageOpens(page.hostname, page.protocol === "https:", !page.port, !!page.username || !!page.password);
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
  return `${authority.web}${connectReturnPath}`;
}

export { newId as freshKey } from "../platform/ids.ts";

/** The native secure slot that keeps one account's pending Cloud delegation. */
export async function delegationSlot(owner: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(owner));
  return `account-delegation:v1:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
