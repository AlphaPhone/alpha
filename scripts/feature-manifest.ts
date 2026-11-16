#!/usr/bin/env node
// Alpha's functional feature manifest, emitted by the mobile-shell emitter
// (apps/app/src/ui/mobile-shell/feature-manifest.ts) from apps/app/src/product/alpha-product-registration.ts,
// and the exact inventory of Alpha's behavioural source modules (test/support/module-inventory.mjs).
//
//   node scripts/feature-manifest.ts            print Alpha's manifest
//   node scripts/feature-manifest.ts --modules  print the behavioural modules as they are now
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {tsImport} from 'tsx/esm/api';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORE = 'apps/app/src/ui/mobile-shell/core.ts';

/** Source that is not identity, theme or product registration: behaviour Alpha owns. */
export function alphaBehaviouralModules(cwd = root) {
  const files = execFileSync('git', ['ls-files', 'apps/app/src', 'android/app/src/main/java'], {cwd, encoding: 'utf8'}).split('\n').filter(Boolean);
  return files.filter(file =>
    /\.(?:ts|tsx|js|mjs|java|kt)$/.test(file) && !file.endsWith('.d.ts') &&
    !file.startsWith('apps/app/src/product/') && fs.existsSync(path.join(cwd, file))).sort();
}

export async function featureManifest(cwd = root) {
  const core = await tsImport(pathToFileURL(path.join(cwd, CORE)).href, import.meta.url);
  const {ALPHA_PRODUCT_REGISTRATION} = await import(pathToFileURL(path.join(cwd, 'apps/app/src/product/alpha-product-registration.ts')).href);
  return {
    alpha: core.mobileFeatureManifest(core.defineMobileProductRegistration(ALPHA_PRODUCT_REGISTRATION)),
    modules: alphaBehaviouralModules(cwd),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await featureManifest();
  const output = process.argv.includes('--modules') ? manifest.modules : manifest.alpha;
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}
