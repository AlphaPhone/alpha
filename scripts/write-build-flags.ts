#!/usr/bin/env node
// Records how a web bundle was built (web-dist/build-flags.json), which scripts/audit-production-bundle.ts
// requires: testMocks from ELIZA_DEV_ALLOW_TEST_MOCKS (the same input as apps/app/vite.config.ts's
// __ALPHA_TEST_MOCKS__ define) and candidateCloud when the build addresses a candidate Cloud deployment.
//   node scripts/write-build-flags.ts [<dir>]   (default web-dist)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CLOUD_DEPLOYMENT_IS_CANDIDATE} from './cloud-deployment-policy.ts';

/** The record for the current build environment. */
export function buildFlags(env: NodeJS.ProcessEnv = process.env, candidate = CLOUD_DEPLOYMENT_IS_CANDIDATE) {
  return {testMocks: env.ELIZA_DEV_ALLOW_TEST_MOCKS === '1', ...(candidate ? {candidateCloud: true} : {})};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const dir = path.resolve(root, process.argv[2] ?? 'web-dist');
  if (!fs.existsSync(path.join(dir, 'index.html'))) { console.error(`No built bundle at ${dir}`); process.exit(1); }
  fs.writeFileSync(path.join(dir, 'build-flags.json'), JSON.stringify(buildFlags()) + '\n');
  console.log(`Recorded ${path.relative(root, path.join(dir, 'build-flags.json'))}: ${JSON.stringify(buildFlags())}`);
}
