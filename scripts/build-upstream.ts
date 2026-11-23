#!/usr/bin/env node
// Build the pinned upstream workspace packages the app and the Cloud package compile against (their dist
// declarations) with upstream's own task graph. vendor/eliza is a member of this pnpm workspace, but its
// turbo.json is a root configuration that this repository's turbo cannot read as a package configuration,
// so the root tasks depend on this one instead of "^build".
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packages = process.argv.slice(2);
const filters = packages.length === 0 ? ['--filter=./packages/*', '--filter=//'] : packages.map((name) => `--filter=${name}`);
// The outer run's own variables would make the inner run read as part of it.
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('TURBO_') || name === 'TURBO_TELEMETRY_DISABLED'));
const result = spawnSync('pnpm', ['exec', 'turbo', 'run', 'build', ...filters, '--output-logs=errors-only'],
  {cwd: path.join(root, 'vendor/eliza'), stdio: 'inherit', env});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
