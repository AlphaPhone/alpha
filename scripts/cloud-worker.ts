#!/usr/bin/env node
/**
 * Alpha Cloud operator tool: the workspace cloud package (@elizaos/cloud) run with Alpha's own
 * deployment profile (cloud/src/profile.vibe), native client registration and web host Worker.
 * Every decision about the profile, the registration and the rendered Workers is made by the
 * `alpha-cloud` VibeLang command line (cloud/src/cli.vibe); this script orchestrates it, upstream's
 * `elizaos-cloud` operator commands and Wrangler. Secrets never enter the repository: --env-file
 * names a private NAME=value file (mode 600, outside the checkout).
 *
 *   node scripts/cloud-worker.ts profile   --inputs F --out FILE [--local ORIGIN…]
 *   node scripts/cloud-worker.ts secrets   --environment ENV --env-file F [--apply]  [--frozen]
 *   node scripts/cloud-worker.ts provision --environment ENV --env-file F [--write]
 *   node scripts/cloud-worker.ts preflight --environment ENV [--env-file F]
 *   node scripts/cloud-worker.ts migrate   --environment ENV --inputs F --env-file F
 *   node scripts/cloud-worker.ts seed      --environment ENV --inputs F --env-file F
 *   node scripts/cloud-worker.ts prices    --environment ENV --inputs F --env-file F
 *   node scripts/cloud-worker.ts render    --environment ENV --inputs F [--out DIR]
 *   node scripts/cloud-worker.ts check     --environment ENV --inputs F [--out DIR]   render and bundle, no network
 *   node scripts/cloud-worker.ts deploy    --environment ENV --inputs F --env-file F [--component api|edge|all]
 *   node scripts/cloud-worker.ts smoke     --environment ENV
 *
 * --inputs names the operator inputs (cloud/src/profile.vibe OperatorInputs): database receipts,
 * Terms and Privacy, entitlement public keys and provider ids for both environments.
 */
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {ALPHA_CLOUD_DEPLOYMENT, CLOUD_SIGN_IN_REGISTRATION, cloudEnvironments, type CloudEnvironment} from './cloud-deployment-policy.ts';
import {reconcileCloudResources, writeProvisionedResources} from './cloud-provision.ts';
import {publishedAssetLinksCheck} from './render-assetlinks.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cloudDir = path.join(root, 'cloud');
const identity = JSON.parse(fs.readFileSync(path.join(root, 'app.config.json'), 'utf8')) as {appId: string; appName: string};

export interface CloudResources {
  workerName: string; accountId: string; zone: string; blobHost: string; loginApiUrl: string; mailFrom: string;
  hyperdriveId: string; kvNamespaceId: string; r2Bucket: string; rateLimitNamespaceIds: Record<string, string>;
}

/** Values the operator supplies per environment; the Worker reads them as secrets. */
export const OPERATOR_SECRETS = Object.freeze({
  required: ['DATABASE_URL', 'RESEND_API_KEY', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CONNECT_CLIENT_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
    'CEREBRAS_API_KEY', 'CARTESIA_API_KEY', 'GOOGLE_MAPS_API_KEY'],
  optional: ['STRIPE_PUBLISHABLE_KEY'],
});
/** Secrets this tool generates once and keeps in the env file; rerunning never rotates them. */
export const GENERATED_SECRETS = Object.freeze(['CLOUD_DIGEST_KEY', 'CLOUD_SEALING_KEY', 'CLOUD_ENTITLEMENT_KEY', 'EMAIL_CODE_SECRET', 'GOOGLE_CONNECT_TOKEN_KEY']);
/** The API Worker's secret names, mapped from the env file (the profile and the Worker name the inference key differently). */
export const WORKER_SECRET_SOURCE: Readonly<Record<string, string>> = Object.freeze({
  EMAIL_CODE_SECRET: 'EMAIL_CODE_SECRET', RESEND_API_KEY: 'RESEND_API_KEY', GOOGLE_CLIENT_SECRET: 'GOOGLE_CLIENT_SECRET',
  GOOGLE_CONNECT_CLIENT_SECRET: 'GOOGLE_CONNECT_CLIENT_SECRET', GOOGLE_CONNECT_TOKEN_KEY: 'GOOGLE_CONNECT_TOKEN_KEY',
  STRIPE_SECRET_KEY: 'STRIPE_SECRET_KEY', STRIPE_WEBHOOK_SECRET: 'STRIPE_WEBHOOK_SECRET', INFERENCE_API_KEY: 'CEREBRAS_API_KEY', CARTESIA_API_KEY: 'CARTESIA_API_KEY',
});

const say = (message: string) => console.log(`[cloud] ${message}`);
const loadJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;

/** Run the Alpha Cloud VibeLang command line and return its JSON answer. */
export function alphaCloud(args: string[], env: NodeJS.ProcessEnv = process.env): unknown {
  const result = spawnSync(process.execPath, ['--conditions=eliza-source', '--import', 'vibelang/register', path.join(cloudDir, 'src/cli.vibe'), ...args],
    {cwd: cloudDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], env});
  if (result.status !== 0) throw new Error(`alpha-cloud ${args[0]} failed`);
  return JSON.parse(result.stdout);
}

/** Run upstream's `elizaos-cloud` from the workspace with the given environment (secrets included, never logged). */
function elizaosCloud(args: string[], env: NodeJS.ProcessEnv) {
  const main = path.join(root, 'vendor/eliza/packages/cloud/src/main.vibe');
  const result = spawnSync(process.execPath, ['--conditions=eliza-source', '--import', 'vibelang/register', main, ...args], {cwd: cloudDir, stdio: 'inherit', env});
  if (result.status !== 0) throw new Error(`elizaos-cloud ${args.slice(0, 2).join(' ')} failed (exit ${result.status})`);
}

function wrangler(args: string[], {input, accountId}: {input?: string; accountId?: string} = {}) {
  const bin = path.join(cloudDir, 'node_modules/.bin/wrangler');
  if (!fs.existsSync(bin)) throw new Error('wrangler is not installed: run pnpm install');
  const result = spawnSync(bin, args, {cwd: cloudDir, input, encoding: 'utf8', stdio: [input === undefined ? 'inherit' : 'pipe', 'inherit', 'inherit'],
    env: {...process.env, ...(accountId ? {CLOUDFLARE_ACCOUNT_ID: accountId} : {}), WRANGLER_SEND_METRICS: 'false'}});
  if (result.status !== 0) throw new Error(`wrangler ${args.slice(0, 2).join(' ')} failed`);
}

export function readEnvFile(file: string): Record<string, string> {
  const resolved = path.resolve(file);
  if (resolved.startsWith(root + path.sep)) throw new Error('The secrets file must live outside the checkout');
  if (!fs.existsSync(resolved)) return {};
  if ((fs.statSync(resolved).mode & 0o077) !== 0) throw new Error(`${resolved} must be private (chmod 600)`);
  const values: Record<string, string> = {};
  for (const line of fs.readFileSync(resolved, 'utf8').split('\n')) {
    const match = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    values[match[1]] = /^(['"]).*\1$/.test(match[2]) ? match[2].slice(1, -1) : match[2];
  }
  return values;
}

function writeEnvFile(file: string, values: Record<string, string>) {
  const text = Object.entries(values).map(([name, value]) => {
    if (/[\r\n]/.test(value)) throw new Error(`${name} cannot span lines`);
    return `${name}=${value}`;
  }).join('\n') + '\n';
  fs.writeFileSync(file, text, {mode: 0o600});
  fs.chmodSync(file, 0o600);
}

/** Fill every generated secret that is absent and return the entitlement public key the operator records in the inputs. */
/** With `frozen` (CI), nothing is generated: a sealing or entitlement key minted on a runner would rotate and be lost. */
export function completeSecrets(values: Record<string, string>, {frozen = false} = {}): {values: Record<string, string>; entitlementPublicKey: crypto.JsonWebKey} {
  if (frozen) {
    const absent = GENERATED_SECRETS.filter(name => !values[name]);
    if (absent.length) throw new Error(`Generated secrets are absent (${absent.join(', ')}); run \`secrets\` once locally and store the completed file`);
  }
  const next = {...values};
  for (const name of ['CLOUD_DIGEST_KEY', 'CLOUD_SEALING_KEY', 'EMAIL_CODE_SECRET', 'GOOGLE_CONNECT_TOKEN_KEY']) if (!next[name]) next[name] = crypto.randomBytes(32).toString('base64url');
  if (!next.CLOUD_ENTITLEMENT_KEY) next.CLOUD_ENTITLEMENT_KEY = crypto.generateKeyPairSync('ec', {namedCurve: 'P-256'}).privateKey.export({type: 'pkcs8', format: 'der'}).toString('base64');
  const privateKey = crypto.createPrivateKey({key: Buffer.from(next.CLOUD_ENTITLEMENT_KEY, 'base64'), format: 'der', type: 'pkcs8'});
  const {kty, crv, x, y} = crypto.createPublicKey(privateKey).export({format: 'jwk'});
  return {values: next, entitlementPublicKey: {kty, crv, x, y}};
}

export function secretProblems(values: Record<string, string>, environment: CloudEnvironment): string[] {
  const problems = OPERATOR_SECRETS.required.filter(name => !values[name]).map(name => `${name} is missing`);
  const stripe = values.STRIPE_SECRET_KEY;
  if (stripe && environment === 'production' && !/^(sk|rk)_live_/.test(stripe)) problems.push('STRIPE_SECRET_KEY must be a live key in production');
  if (stripe && environment === 'staging' && !/^(sk|rk)_test_/.test(stripe)) problems.push('STRIPE_SECRET_KEY must be a test key in staging');
  if (values.DATABASE_URL && !/^postgres(ql)?:\/\//.test(values.DATABASE_URL)) problems.push('DATABASE_URL must be a postgres:// URL');
  for (const name of GENERATED_SECRETS) if (values[name] && name !== 'CLOUD_ENTITLEMENT_KEY' && Buffer.from(values[name], 'base64url').length < 32) problems.push(`${name} must hold at least 32 bytes`);
  for (const [name, value] of Object.entries(values)) if (/(?:^|[^a-z0-9-])(?:[a-z0-9-]+\.)*(?:eliza\.app|elizacloud\.ai)(?![a-z0-9.-])/i.test(value)) problems.push(`${name} names a deployed Eliza Cloud host`);
  return problems;
}

/** The API Worker's secrets, by Worker name. */
export function workerSecrets(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(WORKER_SECRET_SOURCE).map(([name, source]) => [name, values[source]]).filter(([, value]) => value));
}

/** The profile, seed and rendered configurations for one run, in a private scratch directory. */
function runDirectory(environment: CloudEnvironment) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `alpha-cloud-${environment}-`));
  fs.chmodSync(directory, 0o700);
  return directory;
}

function profileFor(inputs: string, directory: string) {
  const file = path.join(directory, 'profile.json');
  alphaCloud(['profile', '--inputs', path.resolve(inputs), '--out', file]);
  return file;
}

function serveEnv(values: Record<string, string>): NodeJS.ProcessEnv {
  return {...process.env, ...values};
}

// ---------------------------------------------------------------------------------------------
// Public readiness: what the phone needs, without credentials.

export async function smoke(environment: CloudEnvironment, fetchImpl: typeof fetch = fetch) {
  const row = ALPHA_CLOUD_DEPLOYMENT[environment];
  const redirectUri = row.web + CLOUD_SIGN_IN_REGISTRATION.callbackPath;
  const registration = new URLSearchParams({clientId: identity.appId, environment, redirectUri});
  const rows: {gate: string; passed: boolean; detail: string}[] = [];
  const json = (text: string) => { try { return JSON.parse(text); } catch { return null; } };
  const probe = async (gate: string, url: string, test: (response: Response, text: string) => string | null) => {
    try {
      const response = await fetchImpl(url, {redirect: 'manual', signal: AbortSignal.timeout(15_000), headers: {'cache-control': 'no-cache'}});
      const text = await response.text();
      const problem = response.status === 200 ? test(response, text) : `HTTP ${response.status}`;
      rows.push({gate, passed: !problem, detail: problem ?? `HTTP ${response.status}`});
    } catch (error) { rows.push({gate, passed: false, detail: (error as Error).message}); }
  };
  await probe('api health', `${row.api}/api/health`, (_response, text) => json(text) ? null : 'expected a JSON health answer');
  await probe('service document', `${row.api}/api/public/service`, (_response, text) => {
    const body = json(text);
    const complete = (document: {title?: unknown; revision?: unknown; sections?: unknown}) => typeof document?.title === 'string' && typeof document.revision === 'string' && Array.isArray(document.sections) && document.sections.length > 0;
    return body?.success === true && body.service?.name === row.name && complete(body.service.terms) && complete(body.service.privacy) ? null : 'expected Alpha Cloud Terms and Privacy';
  });
  await probe('entitlement keys', `${row.api}/api/v1/subscription/entitlement-keys`, (_response, text) => {
    const keys: unknown = json(text)?.keys;
    const usable = Array.isArray(keys) && keys.length > 0 && keys.every(key => {
      if (key?.kty !== 'EC' || key.crv !== 'P-256' || typeof key.kid !== 'string' || key.d !== undefined) return false;
      try { crypto.createPublicKey({key, format: 'jwk'}); return true; } catch { return false; }
    });
    return usable ? null : 'expected a nonempty set of public P-256 entitlement keys';
  });
  await probe('app registration', `${row.api}/api/v1/app-auth/mobile/config?${registration}`, (_response, text) => {
    const config = json(text);
    return config?.clientId === identity.appId && config.redirectUri === redirectUri && config.codeChallengeMethod === 'S256' ? null : 'expected the exact native client, callback and S256';
  });
  await probe('plans', `${row.api}/api/v1/subscriptions/plans`, (_response, text) => {
    const plans: unknown = json(text)?.plans;
    return Array.isArray(plans) && ['plus_monthly', 'pro_monthly'].every(key => plans.some(plan => plan?.key === key)) ? null : 'expected the Plus and Pro plans';
  });
  // Upstream answers {email, sms, google} (spec/cloud/deployment.md, MethodsAnswer). Alpha's profile delivers mail and
  // configures Google, and has no SMS delivery (cloud/src/profile.vibe), so the phone's email and Google sign-in must be
  // offered; SMS is reported, not required.
  await probe('sign-in methods', `${row.api}/api/v1/auth/methods`, (_response, text) => {
    const methods = json(text);
    const shaped = ['email', 'sms', 'google'].every(name => typeof methods?.[name] === 'boolean');
    if (!shaped) return 'expected the sign-in methods {email, sms, google}';
    const missing = ['email', 'google'].filter(name => methods[name] !== true);
    return missing.length ? `${missing.join(' and ')} sign-in not offered` : null;
  });
  await probe('asset links', `${row.web}/.well-known/assetlinks.json`, (response, text) => {
    if (!/^application\/json\b/i.test(response.headers.get('content-type') ?? '')) return 'not application/json';
    const signer = loadJson<{signerSha256: string}>(path.join(root, 'android/release-signer.json')).signerSha256;
    const links = publishedAssetLinksCheck(text, {packageName: identity.appId, signerSha256: signer});
    return links.granted ? null : links.problems.join('; ');
  });
  const callback = new URL(redirectUri);
  const callbackIntent = `intent://${callback.host}${callback.pathname}#Intent;scheme=https;package=${identity.appId};end`;
  await probe('callback page', redirectUri, (response, text) => /^text\/html\b/i.test(response.headers.get('content-type') ?? '')
    && text.includes(`href="${callbackIntent}"`) ? null : 'expected the hosted return page for this Android package');
  return rows;
}

// ---------------------------------------------------------------------------------------------

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {values: o, positionals} = parseArgs({allowPositionals: true, options: {
    inputs: {type: 'string'}, resources: {type: 'string', default: path.join(cloudDir, 'resources.json')}, out: {type: 'string'},
    environment: {type: 'string'}, 'env-file': {type: 'string'}, component: {type: 'string', default: 'all'}, local: {type: 'string', multiple: true},
    apply: {type: 'boolean', default: false}, frozen: {type: 'boolean', default: false}, write: {type: 'boolean', default: false}, json: {type: 'boolean', default: false}}});
  const command = positionals[0];
  const usage = () => { console.error('Usage: node scripts/cloud-worker.ts profile|secrets|provision|preflight|migrate|seed|prices|render|check|deploy|smoke [options] (see the header of this file)'); process.exit(2); };
  const environment = () => { const value = o.environment as CloudEnvironment; if (!cloudEnvironments.includes(value)) usage(); return value; };
  const envFile = () => { if (!o['env-file']) usage(); return path.resolve(o['env-file']!); };
  const inputs = () => { if (!o.inputs) usage(); return path.resolve(o.inputs!); };
  const resources = () => loadJson<Record<CloudEnvironment, CloudResources>>(o.resources!);
  const reconcile = (env: CloudEnvironment, databaseUrl?: string, create = false) =>
    reconcileCloudResources({ids: resources()[env], sibling: resources()[env === 'staging' ? 'production' : 'staging'],
      apiHost: new URL(ALPHA_CLOUD_DEPLOYMENT[env].api).host, webHost: new URL(ALPHA_CLOUD_DEPLOYMENT[env].web).host,
      databaseUrl, accountId: process.env.CLOUDFLARE_ACCOUNT_ID, token: process.env.CLOUDFLARE_API_TOKEN, create});
  const render = (env: CloudEnvironment) => alphaCloud(['render', '--inputs', inputs(), '--environment', env, '--resources', o.resources!, ...(o.out ? ['--out', path.resolve(o.out)] : [])]) as {api: string; edge: string};
  try {
    switch (command) {
      case 'profile': {
        if (!o.out) usage();
        console.log(JSON.stringify(alphaCloud(['profile', '--inputs', inputs(), '--out', path.resolve(o.out!), ...(o.local ?? []).flatMap(origin => ['--local', origin])]), null, 1));
        break;
      }
      case 'secrets': {
        const env = environment(), file = envFile();
        const {values, entitlementPublicKey} = completeSecrets(readEnvFile(file), {frozen: o.frozen});
        if (!o.frozen) writeEnvFile(file, values);
        say(`entitlement public key for the ${env} operator inputs: ${JSON.stringify(entitlementPublicKey)}`);
        const problems = secretProblems(values, env);
        if (problems.length) throw new Error(problems.join('\n'));
        if (o.apply) wrangler(['secret', 'bulk', '--name', resources()[env].workerName], {input: JSON.stringify(workerSecrets(values)), accountId: resources()[env].accountId});
        say(`${env} secrets complete${o.apply ? ' and uploaded' : ''}`);
        break;
      }
      case 'provision': case 'preflight': {
        const env = environment();
        const values = o['env-file'] ? readEnvFile(envFile()) : {};
        const verified = await reconcile(env, values.DATABASE_URL, command === 'provision');
        if (command === 'provision' && o.write) writeProvisionedResources(o.resources!, env, resources()[env], verified);
        say(`${command}: ${env} resources verified`);
        break;
      }
      case 'migrate': case 'seed': case 'prices': {
        const env = environment(), values = readEnvFile(envFile());
        if (!values.DATABASE_URL) throw new Error('DATABASE_URL is required');
        const directory = runDirectory(env);
        try {
          const profile = profileFor(inputs(), directory);
          if (command === 'migrate') elizaosCloud(['migrate', '--profile', profile, '--environment', env, '--store', values.DATABASE_URL], serveEnv(values));
          else if (command === 'prices') elizaosCloud(['prices', 'check', '--profile', profile, '--environment', env], serveEnv(values));
          else {
            const file = path.join(directory, `registration.${env}.json`);
            const {apply} = alphaCloud(['registration', '--inputs', inputs(), '--environment', env, '--out', file]) as {apply: string[]};
            elizaosCloud([...apply, '--profile', profile, '--environment', env, '--store', values.DATABASE_URL], serveEnv(values));
          }
        } finally { fs.rmSync(directory, {recursive: true, force: true}); }
        break;
      }
      case 'render': case 'check': {
        const env = environment(), rendered = render(env);
        if (command === 'check') for (const config of [rendered.api, rendered.edge]) wrangler(['deploy', '--dry-run', '--config', config, '--outdir', path.join(path.dirname(config), `bundle-${path.basename(config, '.json')}`)]);
        say(`${command === 'check' ? 'Rendered and bundled (dry run, nothing deployed)' : 'Rendered'}: ${rendered.api}, ${rendered.edge}`);
        break;
      }
      case 'deploy': {
        const env = environment(), values = readEnvFile(envFile());
        const problems = secretProblems(values, env);
        if (problems.length) throw new Error(problems.join('\n'));
        if (!process.env.CLOUDFLARE_API_TOKEN?.trim()) throw new Error('CLOUDFLARE_API_TOKEN is required to deploy Alpha Cloud');
        await reconcile(env, values.DATABASE_URL, false);
        const rendered = render(env);
        const directory = runDirectory(env);
        try {
          const secrets = path.join(directory, 'secrets.json');
          fs.writeFileSync(secrets, JSON.stringify(workerSecrets(values)), {mode: 0o600});
          const accountId = resources()[env].accountId;
          if (o.component === 'api' || o.component === 'all') wrangler(['deploy', '--config', rendered.api, '--secrets-file', secrets], {accountId});
          if (o.component === 'edge' || o.component === 'all') wrangler(['deploy', '--config', rendered.edge], {accountId});
        } finally { fs.rmSync(directory, {recursive: true, force: true}); }
        say(`deployed ${o.component} (${env})`);
        break;
      }
      case 'smoke': {
        const rows = await smoke(environment());
        if (o.json) console.log(JSON.stringify(rows, null, 1));
        else for (const row of rows) console.log(`${row.passed ? 'PASS' : 'FAIL'} ${row.gate}: ${row.detail}`);
        if (rows.some(row => !row.passed)) process.exitCode = 1;
        break;
      }
      default: usage();
    }
  } catch (error) {
    console.error(`[cloud] ${(error as Error).message}`);
    process.exitCode = 1;
  }
}
