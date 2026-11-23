#!/usr/bin/env node
// The repository-level tooling and Cloud operator tests (test/*.test.mjs) under node:test. The app's own tests run
// in Vitest (pnpm test); these cover Alpha's build, signing, release, licence and Cloud operator scripts.
//
// test/root-tests.json lists every tooling and Cloud test scripts/legacy-retirement.json names: each one is either
// run here, or held with the reason and the place its behaviour moved to. A test missing from both lists fails the
// run, so none is dropped silently.
//   node --conditions=eliza-source --import vibelang/register scripts/run-root-tests.ts [--list]
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT_TESTS = 'test/root-tests.json';
const TOOLING_AREAS = new Set(['tooling', 'cloud']);

interface Held {files: string[]; reason: string; movedTo: string}
interface RootTests {schema: 1; run: string[]; held: Held[]}

export function readRootTests(directory = root): RootTests {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, ROOT_TESTS), 'utf8')) as RootTests;
  if (manifest.schema !== 1 || !Array.isArray(manifest.run) || !Array.isArray(manifest.held)) throw new Error(`${ROOT_TESTS} must be schema 1 with run and held lists`);
  return manifest;
}

/** Problems with the manifest: every listed tooling test is classified once, run files exist, held groups say why. */
export function rootTestProblems(directory = root): string[] {
  const manifest = readRootTests(directory);
  const retirement = JSON.parse(fs.readFileSync(path.join(directory, 'scripts/legacy-retirement.json'), 'utf8')) as {tests: {legacy: string; area: string}[]};
  const listed = retirement.tests.filter(row => TOOLING_AREAS.has(row.area) && /\.test\.mjs$/.test(row.legacy) && fs.existsSync(path.join(directory, row.legacy))).map(row => row.legacy);
  const held = manifest.held.flatMap(group => group.files);
  const problems: string[] = [];
  const seen = new Map<string, number>();
  for (const file of [...manifest.run, ...held]) seen.set(file, (seen.get(file) ?? 0) + 1);
  for (const [file, count] of seen) if (count > 1) problems.push(`${file} is classified ${count} times`);
  for (const file of listed) if (!seen.has(file)) problems.push(`${file} is neither run nor held`);
  for (const file of manifest.run) if (!fs.existsSync(path.join(directory, file))) problems.push(`${file} is listed to run but does not exist`);
  for (const group of manifest.held) if (!group.reason?.trim() || !group.movedTo?.trim() || !group.files?.length) problems.push(`a held group needs files, a reason and where the behaviour moved: ${JSON.stringify(group).slice(0, 120)}`);
  return problems;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = rootTestProblems();
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  const {run} = readRootTests();
  if (process.argv.includes('--list')) { console.log(run.join('\n')); process.exit(0); }
  const result = spawnSync(process.execPath, ['--conditions=eliza-source', '--import', 'vibelang/register', '--test', '--test-concurrency=4', ...run], {cwd: root, stdio: 'inherit'});
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
