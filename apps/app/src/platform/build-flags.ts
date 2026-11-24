// spec/platform/index.md, "Mocks, fixtures and developer surfaces exist only when the build allows test mocks"; spec/platform/index.md, "Eliza Cloud stays the live host until the Alpha Cloud cutover flag is set"
import appConfigText from "../../../../app.config.json?raw";
import deploymentText from "../../../../cloud/deployment.json?raw";

declare const __ALPHA_TEST_MOCKS__: boolean | undefined;

/** ELIZA_DEV_ALLOW_TEST_MOCKS=1 at build time, as vite.config.ts defines `__ALPHA_TEST_MOCKS__`; off everywhere else. */
export const testMocksBuilt: boolean = typeof __ALPHA_TEST_MOCKS__ === "boolean" && __ALPHA_TEST_MOCKS__;

const appConfig: unknown = JSON.parse(appConfigText);

function configured(name: "version" | "appId"): string {
  const value = typeof appConfig === "object" && appConfig !== null ? (appConfig as Record<string, unknown>)[name] : undefined;
  if (typeof value !== "string" || value.length === 0) throw new Error(`app.config.json has no ${name}`);
  return value;
}

/** The app version every distributed build carries, from app.config.json. */
export const appVersion: string = configured("version");

/** The development server serves the page, as Vite reports it. */
export const developmentServer: boolean = import.meta.env?.DEV === true;

/** The app id, which is always Alpha's own. */
export const appId: string = configured("appId");

/** The Alpha Cloud cutover flag, `VITE_ALPHA_CLOUD_CUTOVER=1` at build time as account's deployment reads it: off, the shipped default, every build keeps Eliza Cloud. */
export const alphaCloudCutover: boolean = import.meta.env?.VITE_ALPHA_CLOUD_CUTOVER === "1";

/** The Cloud environment the build asked for with `VITE_ALPHA_CLOUD_ENVIRONMENT`, which only a test-mocks build or a browser preview honours. */
export const cloudEnvironmentAsked: "production" | "staging" | undefined =
  import.meta.env?.VITE_ALPHA_CLOUD_ENVIRONMENT === "staging" ? "staging" : import.meta.env?.VITE_ALPHA_CLOUD_ENVIRONMENT === "production" ? "production" : undefined;

/** The development browser preview of the Cloud resident: `VITE_ALPHA_CLOUD_RESIDENT=1` on the development server, off the phone. @throws {never} */
export function cloudResidentPreview(onDevice: boolean): boolean {
  return developmentServer && !onDevice && import.meta.env?.VITE_ALPHA_CLOUD_RESIDENT === "1";
}


/** The page's own query asked for the developer device controls. @throws {never} */
export function toolsAsked(): boolean {
  return typeof location !== "undefined" && new URLSearchParams(location.search).get("tools") === "1";
}

/** The public authorities of one Cloud environment: its API and web origins, the origin of its hosted services and the audience its entitlements name. */
export interface CloudAuthority {
  readonly name: string;
  readonly api: string;
  readonly web: string;
  readonly services: string;
  readonly entitlementAudience: string;
}

type Environments = Record<"production" | "staging", CloudAuthority>;

const deployment: unknown = JSON.parse(deploymentText);

function section(value: unknown, name: string): Record<string, unknown> {
  const found = typeof value === "object" && value !== null ? (value as Record<string, unknown>)[name] : undefined;
  if (typeof found !== "object" || found === null || Array.isArray(found)) throw new Error(`cloud/deployment.json has no ${name}`);
  return found as Record<string, unknown>;
}

function origin(value: unknown, name: string): string {
  if (typeof value !== "string" || !URL.canParse(value)) throw new Error(`cloud/deployment.json has no ${name} origin`);
  const url = new URL(value);
  if (url.protocol !== "https:" || url.origin !== value) throw new Error(`cloud/deployment.json names ${name} as ${value}, not an HTTPS origin`);
  return url.origin;
}

function text(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`cloud/deployment.json has no ${name}`);
  return value;
}

function shipped(environment: "production" | "staging"): CloudAuthority {
  const row = section(section(deployment, "shipped"), environment);
  return {
    name: text(row.name, `shipped.${environment}.name`),
    api: origin(row.api, `shipped.${environment}.api`),
    web: origin(row.web, `shipped.${environment}.web`),
    services: origin(row.services, `shipped.${environment}.services`),
    entitlementAudience: text(row.entitlementAudience, `shipped.${environment}.entitlementAudience`),
  };
}

function alphaHosts(environment: "production" | "staging"): CloudAuthority {
  const row = section(section(deployment, "alphaCloudHosts"), environment);
  const web = origin(row.web, `alphaCloudHosts.${environment}.web`);
  return { name: "Alpha Cloud", api: origin(row.api, `alphaCloudHosts.${environment}.api`), web, services: web, entitlementAudience: appId };
}

function hasStaging(name: "shipped" | "alphaCloudHosts"): boolean {
  const row = section(deployment, name).staging;
  return typeof row === "object" && row !== null && !Array.isArray(row);
}

const elizaProduction = shipped("production");
const alphaProduction = alphaHosts("production");

/** The Cloud every distributed build uses until the cutover: Eliza Cloud, as cloud/deployment.json ships it. */
export const elizaCloud: Environments = {
  production: elizaProduction,
  staging: hasStaging("shipped") ? shipped("staging") : elizaProduction,
};

/** Alpha's own Cloud on the hosts cloud/deployment.json names, dormant until the cutover flag is set; its entitlements name Alpha's app id. */
export const alphaCloud: Environments = {
  production: alphaProduction,
  staging: hasStaging("alphaCloudHosts") ? alphaHosts("staging") : alphaProduction,
};

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

/** Marks the page root with what the build is, so the shell, its recovery screen and Bombadil read one answer. @throws {never} */
export function markPage(info: { readonly version: string; readonly variant: string; readonly testMocks: boolean }): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement.dataset;
  root.alphaVersion = info.version;
  root.alphaVariant = info.variant;
  root.testMocks = info.testMocks ? "true" : "false";
}
