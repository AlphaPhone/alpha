#!/usr/bin/env node
// Build the pinned upstream workspace packages the app and the Cloud package compile against (their dist
// declarations) with upstream's own task graph. vendor/eliza is a member of this pnpm workspace, but its
// turbo.json is a root configuration that this repository's turbo cannot read as a package configuration,
// so the root tasks depend on this one instead of "^build".
//
// The app and Cloud read upstream through its `eliza-source` export, but VibeLang compiles each upstream
// `.vibe` module with its own package's tsconfig.json, which reads that package's @elizaos dependencies
// through their built declarations. So the packages this repository names, and everything they depend on,
// are built; the other upstream packages are not.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifests = ['package.json', 'apps/app/package.json', 'cloud/package.json'];
const named = new Set<string>();
for (const manifest of manifests) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, manifest), 'utf8')) as Record<string, Record<string, string> | undefined>;
  for (const field of ['dependencies', 'devDependencies'])
    for (const [name, range] of Object.entries(pkg[field] ?? {}))
      if (name.startsWith('@elizaos/') && range.startsWith('workspace:')) named.add(name);
}
const filters = [...named].sort().map((name) => `--filter=${name}...`);
// The outer run's own variables would make the inner run read as part of it.
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('TURBO_') || name === 'TURBO_TELEMETRY_DISABLED'));
const result = spawnSync('pnpm', ['exec', 'turbo', 'run', 'build', ...filters, '--filter=//', '--output-logs=errors-only'],
  {cwd: path.join(root, 'vendor/eliza'), stdio: 'inherit', env});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
