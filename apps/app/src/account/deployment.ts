// spec/account/session.md, "The build addresses one deployment, and staging only with test mocks or the Cloud resident's browser preview"; spec/account/google.md, "Google's consent page is the only page consent opens"
import type { ConsentPage } from "../../gen/account__google.ts";
import type { Deployment, Environment } from "../../gen/account__session.ts";
import deploymentText from "../../../../cloud/deployment.json?raw";
import { alphaCloud, alphaCloudCutover, elizaCloud, type CloudAuthority as PlatformAuthority } from "../platform/build-flags.ts";

/** The public identity of one Cloud environment, with the agents host its Google callbacks may name: never a credential. */
export interface CloudAuthority extends PlatformAuthority {
  readonly agents: string;
}

const clouds = { ElizaCloud: elizaCloud, AlphaCloud: alphaCloud } as const;

/** The public hosts of one Cloud environment as cloud/deployment.json publishes them. */
export interface CloudHosts {
  readonly api: string;
  readonly web: string;
  readonly agents: string;
}

const published: unknown = JSON.parse(deploymentText);

function origin(value: unknown, where: string): string {
  if (typeof value !== "string" || !URL.canParse(value)) throw new Error(`cloud/deployment.json has no origin at ${where}`);
  const url = new URL(value);
  if (url.protocol !== "https:" || url.origin !== value) throw new Error(`cloud/deployment.json names a non-origin at ${where}`);
  return url.origin;
}

function hostsAt(group: "shipped" | "alphaCloudHosts", environment: "production" | "staging"): CloudHosts {
  const groups = typeof published === "object" && published !== null ? (published as Record<string, unknown>)[group] : undefined;
  const entry = typeof groups === "object" && groups !== null ? (groups as Record<string, unknown>)[environment] : undefined;
  const fields = typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : {};
  const where = `${group}.${environment}`;
  const web = origin(fields.web, `${where}.web`);
  return { api: origin(fields.api, `${where}.api`), web, agents: new URL(fields.services === undefined ? web : origin(fields.services, `${where}.services`)).host };
}

function returnPath(name: "billingReturnPath" | "connectReturnPath"): string {
  const signIn = typeof published === "object" && published !== null ? (published as Record<string, unknown>).signIn : undefined;
  const path = typeof signIn === "object" && signIn !== null ? (signIn as Record<string, unknown>)[name] : undefined;
  if (typeof path !== "string" || !/^\/[A-Za-z0-9/_-]+$/.test(path)) throw new Error(`cloud/deployment.json has no signIn.${name}`);
  return path;
}

const billingReturnPath = returnPath("billingReturnPath");
const connectReturnPath = returnPath("connectReturnPath");

/** Each deployment's public hosts, read once from cloud/deployment.json: Eliza Cloud's shipped hosts and Alpha Cloud's own. */
export const cloudHosts: Record<Deployment, Record<Environment, CloudHosts>> = {
  ElizaCloud: { Production: hostsAt("shipped", "production"), Staging: hostsAt("shipped", "staging") },
  AlphaCloud: { Production: hostsAt("alphaCloudHosts", "production"), Staging: hostsAt("alphaCloudHosts", "staging") },
};

/** The deployment this build addresses: Alpha Cloud only once the platform's cutover flag is set, Eliza Cloud otherwise. */
export const deployment: Deployment = alphaCloudCutover ? "AlphaCloud" : "ElizaCloud";

/** The public authority of a deployment's environment: its name and audience from the platform, its hosts from cloud/deployment.json. */
export function authorityOf(of: Deployment, environment: Environment): CloudAuthority {
  const cloud = clouds[of];
  return { ...(environment === "Staging" ? cloud.staging : cloud.production), ...cloudHosts[of][environment] };
}

/** The registered App Link a Stripe page returns to. */
export function billingReturnUrl(authority: CloudAuthority): string {
  return `${authority.web}${billingReturnPath}`;
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
  return `${authority.web}${connectReturnPath}`;
}

export { newId as freshKey } from "../platform/ids.ts";

/** The native secure slot that keeps one account's pending Cloud delegation. */
export async function delegationSlot(owner: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(owner));
  return `account-delegation:v1:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
