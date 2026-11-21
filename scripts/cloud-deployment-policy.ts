import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

/** Installed sign-in routes and browser return namespace, owned by this consumer. */
export const CLOUD_SIGN_IN_REGISTRATION = Object.freeze({
  callbackPath: '/alphaphone/auth/callback',
  /** The Steward app client that carries Alpha's native Google client IDs (AlphaCloudSignInPlugin). */
  stewardAppClient: 'alpha-phone',
  browserSignIn: Object.freeze({
    startPath: '/alphaphone/auth/browser-start',
    returnPath: '/__alpha-browser-cloud/signin-return',
    storageKey: 'alpha-browser-sign-in:v1',
  }),
});

/**
 * The Cloud every distributed build uses. It stays Eliza Cloud until the product's own Cloud is
 * deployed and the cutover release changes these rows (with a storage namespace migration).
 */
export const SHIPPED_CLOUD_DEPLOYMENT = Object.freeze({
  production: Object.freeze({
    api: 'https://api.eliza.app',
    web: 'https://eliza.app',
    services: 'https://cloud.eliza.app',
    tenant: 'elizacloud',
    name: 'Eliza Cloud',
    entitlementAudience: 'eliza-alpha-phone',
  }),
  staging: Object.freeze({
    api: 'https://api-staging.eliza.app',
    web: 'https://staging.eliza.app',
    services: 'https://cloud-staging.eliza.app',
    tenant: 'elizacloud-staging',
    name: 'Eliza Cloud',
    entitlementAudience: 'eliza-alpha-phone',
  }),
});

/** One Cloud environment's public authorities. `alphaCloud` marks Alpha's own Cloud (cloud/policy.json). */
export interface CloudDeploymentPolicyRow {
  readonly api: string; readonly web: string; readonly services: string; readonly tenant: string;
  readonly name?: string; readonly entitlementAudience?: string;
  /** Alpha Cloud (docs/alpha-cloud.md): in-app plans, the native billing authority and the billing App Link. */
  readonly alphaCloud?: boolean;
}
export type CloudDeploymentPolicy = Readonly<Record<'production' | 'staging', CloudDeploymentPolicyRow>>;

/** Alpha's own Cloud (alphacompute.ai), deployed by scripts/cloud-worker.ts; dormant in shipped builds. */
export const ALPHA_CLOUD_POLICY_FILE = fileURLToPath(new URL('../cloud/policy.json', import.meta.url));

/**
 * A candidate Cloud for development and cutover rehearsal: ALPHA_CLOUD_DEPLOYMENT_FILE names a
 * JSON file with the same `production` and `staging` rows. Every build and operator tool then
 * addresses that Cloud instead. A candidate build has its own credential namespace, and the
 * production bundle audit refuses it, so it cannot be distributed by accident.
 *
 * ALPHA_CLOUD_CUTOVER=1 is the Alpha Cloud cutover flag for development, test and validation builds:
 * it selects cloud/policy.json as that candidate (unless ALPHA_CLOUD_DEPLOYMENT_FILE names another
 * Alpha Cloud file). Off, the default, every build keeps the shipped Cloud and its flows.
 */
const cutoverRequested = process.env.ALPHA_CLOUD_CUTOVER === '1';
const candidateFile = process.env.ALPHA_CLOUD_DEPLOYMENT_FILE?.trim() || (cutoverRequested ? ALPHA_CLOUD_POLICY_FILE : '');
export const CLOUD_DEPLOYMENT_IS_CANDIDATE = !!candidateFile;
/** Alpha's public Cloud registration, shared by build and operator tools. */
export const CLOUD_DEPLOYMENT: CloudDeploymentPolicy = candidateFile
  ? Object.freeze(JSON.parse(fs.readFileSync(candidateFile, 'utf8')))
  : SHIPPED_CLOUD_DEPLOYMENT;

/** Whether a deployment is Alpha Cloud: both environments say so, or neither does. */
export function isAlphaCloudDeployment(config: CloudDeploymentPolicy): boolean {
  const production = config.production?.alphaCloud === true, staging = config.staging?.alphaCloud === true;
  if (production !== staging) throw Error('Alpha Cloud must be marked on both production and staging, or neither');
  return production;
}

/**
 * The Alpha Cloud cutover flag, the single source of truth for every build output: the generated
 * renderer, Java and Gradle authorities (scripts/cloud-deployment.ts) carry it as
 * `alphaCloudCutover` / `ALPHA_CLOUD_CUTOVER`. Off (the shipped Eliza Cloud policy), the app uses the
 * current Cloud's hosted billing page and the Alpha Cloud surfaces (in-app plans, the native billing
 * authority, the billing App Link, Stripe and referral routes) are inert. The cutover release turns
 * it on by changing SHIPPED_CLOUD_DEPLOYMENT to cloud/policy.json's rows (docs/alpha-cloud.md §8).
 */
export const ALPHA_CLOUD_CUTOVER = isAlphaCloudDeployment(CLOUD_DEPLOYMENT);
if (cutoverRequested && !ALPHA_CLOUD_CUTOVER) throw Error('ALPHA_CLOUD_CUTOVER=1 needs an Alpha Cloud deployment file (cloud/policy.json)');
