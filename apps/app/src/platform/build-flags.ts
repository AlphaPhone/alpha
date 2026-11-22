// spec/platform/index.md, "Mocks, fixtures and developer surfaces exist only when the build allows test mocks"; spec/platform/index.md, "Eliza Cloud stays the live host until the Alpha Cloud cutover flag is set"
import appConfig from "../../../../app.config.json" with { type: "json" };

declare const __ALPHA_TEST_MOCKS__: boolean | undefined;

/** ELIZA_DEV_ALLOW_TEST_MOCKS=1 at build time, as vite.config.ts defines `__ALPHA_TEST_MOCKS__`; off everywhere else. */
export const testMocksBuilt: boolean = typeof __ALPHA_TEST_MOCKS__ === "boolean" && __ALPHA_TEST_MOCKS__;

/** The app version every distributed build carries, from app.config.json. */
export const appVersion: string = appConfig.version;

/** The app id, which is always Alpha's own. */
export const appId: string = appConfig.appId;

/** The Alpha Cloud cutover flag: off, the shipped default, every build keeps Eliza Cloud. */
export const alphaCloudCutover: boolean = false;

/** The development server serves the page, as Vite reports it. */
export const developmentServer: boolean = import.meta.env?.DEV === true;

/** The page's own query asked for the developer device controls. @throws {never} */
export function toolsAsked(): boolean {
  return typeof location !== "undefined" && new URLSearchParams(location.search).get("tools") === "1";
}

/** The public authorities of one Cloud environment. */
export interface CloudAuthority {
  readonly name: string;
  readonly api: string;
  readonly web: string;
  readonly entitlementAudience: string;
}

/** The Cloud every distributed build uses until the cutover: Eliza Cloud. */
export const elizaCloud = {
  production: { name: "Eliza Cloud", api: "https://api.eliza.app", web: "https://eliza.app", entitlementAudience: "eliza-alpha-phone" },
  staging: { name: "Eliza Cloud", api: "https://api-staging.eliza.app", web: "https://staging.eliza.app", entitlementAudience: "eliza-alpha-phone" },
} as const satisfies Record<"production" | "staging", CloudAuthority>;

/** Alpha's own Cloud, dormant until the cutover flag is set. */
export const alphaCloud = {
  production: { name: "Alpha Cloud", api: "https://api.alphacompute.ai", web: "https://cloud.alphacompute.ai", entitlementAudience: "ai.alphacompute.alphaphone" },
  staging: { name: "Alpha Cloud", api: "https://api-staging.alphacompute.ai", web: "https://cloud-staging.alphacompute.ai", entitlementAudience: "ai.alphacompute.alphaphone" },
} as const satisfies Record<"production" | "staging", CloudAuthority>;

/** The development host's agent origin (`VITE_LOCAL_AGENT_URL`), only in a test-mocks build served off the phone. @throws {never} */
export function developmentAgentBase(onDevice: boolean): URL | undefined {
  const configured = import.meta.env?.VITE_LOCAL_AGENT_URL;
  if (!testMocksBuilt || !developmentServer || onDevice || typeof configured !== "string") return undefined;
  try {
    const url = new URL(configured);
    return url.protocol === "http:" || url.protocol === "https:" ? new URL(url.origin) : undefined;
  } catch {
    return undefined;
  }
}

/** Whether the page is in front, as the document reports it. @throws {never} */
export function pageVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState !== "hidden";
}
