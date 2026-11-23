// The Cloud deployment a build addresses, read from cloud/deployment.json for Node build tools
// (bundle audit, APK verification). The flag logic matches cloud/src/deployment.vibe selectDeployment.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

export interface CloudDeploymentPolicyRow {
  readonly api: string; readonly web: string; readonly services?: string; readonly tenant?: string;
  readonly name?: string; readonly entitlementAudience?: string; readonly alphaCloud?: boolean;
}
export type CloudEnvironment = 'production' | 'staging';
export type CloudDeploymentPolicy = Readonly<Record<CloudEnvironment, CloudDeploymentPolicyRow>>;
export const cloudEnvironments: readonly CloudEnvironment[] = ['production', 'staging'];

export const DEPLOYMENT_FILE = fileURLToPath(new URL('../cloud/deployment.json', import.meta.url));
const deployment = JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, 'utf8')) as {
  signIn: {routePrefix: string; callbackPath: string; billingReturnPath: string; connectReturnPath: string; browserSignIn: {startPath: string; returnPath: string; storageKey: string}};
  storageNamespaces: string[];
  shipped: CloudDeploymentPolicy;
  alphaCloudHosts: Record<CloudEnvironment, {api: string; web: string}>;
};

/** Installed sign-in, billing and Google connection return paths and the browser return namespace. */
export const CLOUD_SIGN_IN_REGISTRATION = Object.freeze(deployment.signIn);
/** Reviewed credential namespaces, oldest first. The last is the one installed phones hold now. */
export const STORAGE_NAMESPACES: readonly string[] = Object.freeze([...deployment.storageNamespaces]);
/** The Cloud every distributed build uses until the cutover release. */
export const SHIPPED_CLOUD_DEPLOYMENT: CloudDeploymentPolicy = Object.freeze(deployment.shipped);
/** Alpha Cloud's client rows (alphacompute.cc), the same hosts cloud/src/profile.vibe serves. */
export const ALPHA_CLOUD_DEPLOYMENT: CloudDeploymentPolicy = Object.freeze(Object.fromEntries(cloudEnvironments.map(environment => [environment,
  {...deployment.alphaCloudHosts[environment], name: 'Alpha Cloud', entitlementAudience: 'ai.alphacompute.alphaphone', alphaCloud: true}])) as Record<CloudEnvironment, CloudDeploymentPolicyRow>);

const cutoverRequested = process.env.ALPHA_CLOUD_CUTOVER === '1';
const candidateFile = process.env.ALPHA_CLOUD_DEPLOYMENT_FILE?.trim() ?? '';
/** Whether this build addresses a candidate Cloud (development, test or cutover rehearsal only). */
export const CLOUD_DEPLOYMENT_IS_CANDIDATE = cutoverRequested || candidateFile !== '';
/** The deployment this build addresses. */
export const CLOUD_DEPLOYMENT: CloudDeploymentPolicy = candidateFile
  ? Object.freeze(JSON.parse(fs.readFileSync(candidateFile, 'utf8')))
  : cutoverRequested ? ALPHA_CLOUD_DEPLOYMENT : SHIPPED_CLOUD_DEPLOYMENT;

/** Whether a deployment is Alpha Cloud: both environments say so, or neither does. */
export function isAlphaCloudDeployment(config: CloudDeploymentPolicy): boolean {
  const production = config.production?.alphaCloud === true, staging = config.staging?.alphaCloud === true;
  if (production !== staging) throw Error('Alpha Cloud must be marked on both production and staging, or neither');
  return production;
}

/** The Alpha Cloud cutover flag every build output carries (cloud/src/deployment.vibe writes them). */
export const ALPHA_CLOUD_CUTOVER = isAlphaCloudDeployment(CLOUD_DEPLOYMENT);
if (cutoverRequested && !ALPHA_CLOUD_CUTOVER) throw Error('ALPHA_CLOUD_CUTOVER=1 needs an Alpha Cloud deployment file');
