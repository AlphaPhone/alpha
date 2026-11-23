#!/usr/bin/env node
// Build the pinned upstream workspace packages the app and the Cloud package compile against (their dist
// declarations) with upstream's own task graph. vendor/eliza is a member of this pnpm workspace, but its
// turbo.json is a root configuration that this repository's turbo cannot read as a package configuration,
// so the root tasks depend on this one instead of "^build".
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const upstreamRoot = path.join(root, 'vendor/eliza');
const upstreamDeps = new Set<string>();
for (const manifestPath of ['package.json', 'apps/app/package.json', 'cloud/package.json']) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestPath), 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  for (const group of [manifest.dependencies, manifest.devDependencies]) {
    for (const [name, spec] of Object.entries(group ?? {})) {
      if (typeof spec === 'string' && spec.startsWith('workspace:') && name !== 'vibestack' && !name.startsWith('@alphacompute/')) {
        upstreamDeps.add(name);
      }
    }
  }
}
const filters = [...[...upstreamDeps].sort().map((name) => `--filter=${name}...`), '--filter=//'];
// The outer run's own variables would make the inner run read as part of it.
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('TURBO_') || name === 'TURBO_TELEMETRY_DISABLED'));
const result = spawnSync('pnpm', ['exec', 'turbo', 'run', 'build', ...filters, '--output-logs=errors-only'],
  {cwd: upstreamRoot, stdio: 'inherit', env});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
