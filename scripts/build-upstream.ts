#!/usr/bin/env node
// Build the pinned upstream workspace packages the app and the Cloud package compile against (their dist
// declarations) with upstream's own task graph. vendor/eliza is a member of this pnpm workspace, but its
// turbo.json is a root configuration that this repository's turbo cannot read as a package configuration,
// so the root tasks depend on this one instead of "^build".
//
// Named packages (`pnpm build:upstream @elizaos/os …`) build just those. With no names, the app and Cloud
// read upstream through its `eliza-source` export, but VibeLang compiles each upstream `.vibe` module with
// its own package's tsconfig.json, which reads that package's @elizaos dependencies through their built
// declarations. So the packages this repository depends on, and everything they depend on, are built; the
// other upstream packages are not.
//
// `--gen` runs only upstream's root generation step (//#gen), which writes each package's gitignored gen/
// directory. Use it when generation is the only prerequisite. `pnpm verify` builds the packages
// before running root tests because the runtime-license tests also load the agent's SDK declarations.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function dependedOn(): string[] {
  const named = new Set<string>();
  for (const manifest of ['package.json', 'apps/app/package.json', 'cloud/package.json']) {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, manifest), 'utf8')) as Record<string, Record<string, string> | undefined>;
    for (const field of ['dependencies', 'devDependencies'])
      for (const [name, range] of Object.entries(pkg[field] ?? {}))
        if (name.startsWith('@elizaos/') && range.startsWith('workspace:')) named.add(name);
  }
  return [...named].sort();
}

const args = process.argv.slice(2);
const genOnly = args.includes('--gen');
const packages = args.filter((name) => name !== '--gen');
if (genOnly && packages.length > 0) throw new Error('--gen runs upstream\'s root generation step; it takes no package names.');
const filters = genOnly ? ['--filter=//'] : packages.length === 0
  ? [...dependedOn().map((name) => `--filter=${name}...`), '--filter=//']
  : packages.map((name) => `--filter=${name}`);
// The outer run's own variables would make the inner run read as part of it.
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('TURBO_') || name === 'TURBO_TELEMETRY_DISABLED'));
const result = spawnSync('pnpm', ['exec', 'turbo', 'run', genOnly ? 'gen' : 'build', ...filters, '--output-logs=errors-only'],
  {cwd: path.join(root, 'vendor/eliza'), stdio: 'inherit', env});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
