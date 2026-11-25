#!/usr/bin/env node
/**
 * Alpha Cloud on this computer: upstream's `elizaos-cloud serve` from the workspace with Alpha's
 * profile in its loopback development form (staging, loopback mail, PGlite), Alpha's native client
 * seeded, and nothing that names a deployed Eliza Cloud. Development only: it needs
 * ELIZA_DEV_ALLOW_TEST_MOCKS=1 and uses test operator inputs unless --inputs names reviewed ones.
 *
 *   ELIZA_DEV_ALLOW_TEST_MOCKS=1 node scripts/local-cloud.ts start [--dir DIR] [--port 8787] [--inputs F]
 *   ELIZA_DEV_ALLOW_TEST_MOCKS=1 node scripts/local-cloud.ts check [--port 8787] [--json]
 *
 * `check` reads the public contract the phone needs from the running local Cloud and sends an
 * email code to a throwaway address, read back from the loopback inbox. It is a local source
 * result only: not a deployed Cloud, an APK, an emulator or a device result.
 */
import {spawn} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {CLOUD_SIGN_IN_REGISTRATION} from './cloud-deployment-policy.ts';
import {alphaCloud} from './cloud-worker.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const identity = JSON.parse(fs.readFileSync(path.join(root, 'app.config.json'), 'utf8')) as {appId: string; appName: string};

/** Hosts of deployed Eliza Clouds. A local answer that names one is a leaked dependency. */
export const DEPLOYED_ELIZA_HOST = /(?:^|[^a-z0-9-])((?:[a-z0-9-]+\.)*(?:eliza\.app|elizacloud\.ai))(?![a-z0-9.-])/i;
export function leakedElizaHost(value: unknown): string | null {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? null);
  return DEPLOYED_ELIZA_HOST.exec(text)?.[1] ?? null;
}

export const localCloudDirectory = (option?: string, env = process.env) =>
  path.resolve(option || env.ALPHA_LOCAL_CLOUD_DIR || path.join(os.homedir(), '.cache', 'alphaphone-local-cloud'));

/** The development origins the loopback profile admits as first party (the Vite renderer and the emulator's host alias). */
export const LOOPBACK_ORIGINS = Object.freeze(['http://127.0.0.1:5173', 'http://localhost:5173', 'http://127.0.0.1:5317']);

function requireMocks() {
  if (process.env.ELIZA_DEV_ALLOW_TEST_MOCKS !== '1') throw new Error('The local Cloud is a development surface: set ELIZA_DEV_ALLOW_TEST_MOCKS=1');
}

function start({dir, port, inputs}: {dir: string; port: number; inputs: string}) {
  requireMocks();
  fs.mkdirSync(dir, {recursive: true, mode: 0o700});
  const profile = path.join(dir, 'profile.json'), seed = path.join(dir, 'seed.json');
  alphaCloud(['profile', '--inputs', inputs, '--out', profile, ...LOOPBACK_ORIGINS.flatMap(origin => ['--local', origin])]);
  alphaCloud(['seed', '--inputs', inputs, '--environment', 'staging', '--out', seed]);
  const secrets = Object.fromEntries(['CLOUD_DIGEST_KEY', 'CLOUD_SEALING_KEY', 'GOOGLE_CLIENT_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'CEREBRAS_API_KEY', 'CARTESIA_API_KEY', 'GOOGLE_MAPS_API_KEY', 'RESEND_API_KEY']
    .map(name => [name, process.env[name] || `local-${crypto.randomBytes(24).toString('base64url')}`]));
  secrets.CLOUD_ENTITLEMENT_KEY = process.env.CLOUD_ENTITLEMENT_KEY || crypto.generateKeyPairSync('ec', {namedCurve: 'P-256'}).privateKey.export({type: 'pkcs8', format: 'der'}).toString('base64');
  const main = path.join(root, 'vendor/eliza/packages/cloud-worker/src/main.vibe');
  const child = spawn(process.execPath, ['--conditions=eliza-source', '--import', 'vibelang/register', main, 'serve', '--profile', profile, '--environment', 'staging',
    '--store', `pglite:${path.join(dir, 'cloud.pglite')}`, '--seed', seed, '--port', String(port), '--host', '127.0.0.1'],
    {cwd: path.join(root, 'cloud'), stdio: 'inherit', env: {...process.env, ...secrets}});
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => child.kill(signal));
  child.on('exit', code => { process.exitCode = code ?? 1; });
  console.log(`Alpha Cloud (local, staging profile) on http://127.0.0.1:${port}; the emulator reaches it as http://10.0.2.2:${port}.`);
}

async function check({port}: {port: number}) {
  requireMocks();
  const base = `http://127.0.0.1:${port}`;
  const staging = JSON.parse(fs.readFileSync(path.join(root, 'cloud/deployment.json'), 'utf8')).alphaCloudHosts.staging as {api: string; web: string};
  const redirectUri = staging.web + CLOUD_SIGN_IN_REGISTRATION.callbackPath;
  const rows: {gate: string; passed: boolean; detail: string}[] = [];
  const call = async (gate: string, route: string, test: (body: unknown) => string | null, init?: RequestInit) => {
    try {
      const response = await fetch(base + route, {...init, signal: AbortSignal.timeout(15_000)});
      const text = await response.text();
      let body: unknown = null;
      try { body = JSON.parse(text); } catch { body = text; }
      const leak = leakedElizaHost(body);
      const problem = !response.ok ? `HTTP ${response.status}` : leak ? `names ${leak}` : test(body);
      rows.push({gate, passed: !problem, detail: problem ?? `HTTP ${response.status}`});
      return body;
    } catch (error) { rows.push({gate, passed: false, detail: (error as Error).message}); return null; }
  };
  const record = (value: unknown) => (value && typeof value === 'object' ? value : {}) as Record<string, any>;
  await call('health', '/api/health', () => null);
  await call('service document', '/api/public/service', body => record(body).service?.name === 'Alpha Cloud' ? null : 'expected Alpha Cloud');
  await call('entitlement keys', '/api/v1/subscription/entitlement-keys', body => Array.isArray(record(body).keys) && record(body).keys.length > 0 ? null : 'expected public keys');
  await call('app registration', `/api/v1/app-auth/mobile/config?${new URLSearchParams({clientId: identity.appId, environment: 'staging', redirectUri})}`,
    body => record(body).clientId === identity.appId ? null : 'expected the seeded Alpha Phone client');
  await call('plans', '/api/v1/subscriptions/plans', body => Array.isArray(record(body).plans) ? null : 'expected the plan catalogue');
  await call('sign-in methods', '/api/v1/auth/methods', () => null);
  await call('asset links', '/.well-known/assetlinks.json', body => JSON.stringify(body).includes(identity.appId) ? null : 'expected the Alpha Phone package');
  const email = `alpha-local-${crypto.randomUUID()}@example.invalid`;
  const verifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  await call('email code sent', '/api/v1/auth/email/code/send', () => null,
    {method: 'POST', headers: {'content-type': 'application/json', origin: LOOPBACK_ORIGINS[0]}, body: JSON.stringify({email, clientId: identity.appId, codeChallenge})});
  await call('email code in the loopback inbox', `/api/test/inbox/${encodeURIComponent(email)}`, body => /\d{6}/.test(String(record(body).text ?? '')) ? null : 'expected a code');
  return rows;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {values: o, positionals} = parseArgs({allowPositionals: true, options: {
    dir: {type: 'string'}, port: {type: 'string', default: '8787'}, inputs: {type: 'string'}, json: {type: 'boolean', default: false}}});
  const port = Number(o.port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local Cloud port');
  const inputs = path.resolve(o.inputs ?? path.join(root, 'cloud/test/fixtures/operator.json'));
  try {
    if (positionals[0] === 'start') start({dir: localCloudDirectory(o.dir), port, inputs});
    else if (positionals[0] === 'check') {
      const rows = await check({port});
      if (o.json) console.log(JSON.stringify(rows, null, 1));
      else for (const row of rows) console.log(`${row.passed ? 'PASS' : 'FAIL'} ${row.gate}: ${row.detail}`);
      if (rows.some(row => !row.passed)) process.exitCode = 1;
    } else { console.error('Usage: ELIZA_DEV_ALLOW_TEST_MOCKS=1 node scripts/local-cloud.ts start|check [--dir DIR] [--port 8787] [--inputs F] [--json]'); process.exitCode = 2; }
  } catch (error) { console.error(`[local-cloud] ${(error as Error).message}`); process.exitCode = 1; }
}
