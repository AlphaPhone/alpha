#!/usr/bin/env node
/** The renderer (apps/app) against a real Cloud environment with simulated surfaces disabled. */
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {resolve} from 'node:path';

const root = resolve(import.meta.dirname, '..');
const environment = process.env.ALPHA_CLOUD_ENVIRONMENT || 'production';
if (!['production', 'staging'].includes(environment)) throw Error('Invalid Cloud environment');
const uiPort = Number(process.env.ALPHA_CLOUD_UI_PORT || 5318);
if (!Number.isInteger(uiPort) || uiPort < 1024 || uiPort > 65535) throw Error('Invalid Cloud development port');
await new Promise((ready, reject) => { const server = createServer(); server.once('error', reject); server.listen(uiPort, '127.0.0.1', () => server.close(ready)); });
const env: NodeJS.ProcessEnv = {...process.env, ELIZA_DEV_ALLOW_TEST_MOCKS: '', VITE_ALPHA_CLOUD_RESIDENT: '1', VITE_ALPHA_CLOUD_ENVIRONMENT: environment};
// Inherited provider and developer flags cannot change this launch's authority.
for (const key of Object.keys(env)) if (/^(?:CEREBRAS_|OPENAI_|ANTHROPIC_|ELIZAOS_CLOUD_|ALPHA_DEV_|VITE_ALPHA_DEV_)/.test(key)) delete env[key];
if (process.env.ALPHA_CLOUD_REALTIME_VOICE === '1') { env.ALPHA_DEV_CLOUD_REALTIME_VOICE = '1'; env.VITE_ALPHA_DEV_CLOUD_REALTIME_VOICE = '1'; }
const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(uiPort), '--strictPort'], {cwd: resolve(root, 'apps/app'), env, stdio: 'inherit'});
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => child.kill(signal));
child.on('error', () => { console.error('Cloud development server failed'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
console.log(`Cloud ${environment} preview: http://127.0.0.1:${uiPort}; sign in through Alpha. No mock runtime is used.`);
