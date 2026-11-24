#!/usr/bin/env node
// The repository-level tooling and Cloud operator tests (test/*.test.mjs) under node:test. The app's own tests run
// in Vitest (pnpm test); these cover Alpha's build, signing, release, licence and Cloud operator scripts.
//
// test/root-tests.json lists every tooling and Cloud test scripts/legacy-retirement.json names: each one is either
// run here, or held with the reason and the place its behaviour moved to. Every other test/*.test.mjs is a legacy
// renderer test the retirement map assigns to an area spec, deleted once that rule and its conformance test cover it.
// A test in none of these, or a retirement row that no longer matches the tree, fails the run, so none is dropped
// silently.
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

interface RetirementRow {legacy: string; area: string; status: string; spec?: string; replacement?: string; note?: string}
type Retirement = Record<'tests' | 'quint' | 'lemma' | 'scripts', RetirementRow[]>;
// A repository path named in a replacement or note: it must exist unless it is a pattern.
const NAMED_PATH = /(?:^|[\s(,'`])((?:scripts|apps|test|android|cloud|docs|specs|\.github)\/[\w./*-]*[\w*])/g;

/** Problems with scripts/legacy-retirement.json against the tree: a mapped legacy file is still here and a removed one
 *  is gone, every spec it names exists, every path a replacement or note names exists, and each row says where it went. */
export function retirementProblems(retirement: Retirement, directory = root): string[] {
  const exists = (file: string) => fs.existsSync(path.join(directory, file));
  const problems: string[] = [];
  for (const section of ['tests', 'quint', 'lemma', 'scripts'] as const) for (const row of retirement[section]) {
    const at = `scripts/legacy-retirement.json ${section} ${row.legacy}`;
    if (row.status === 'mapped' && !exists(row.legacy)) problems.push(`${at} is mapped but the file is gone: mark it removed`);
    else if (row.status === 'removed' && exists(row.legacy)) problems.push(`${at} is removed but the file is still here`);
    else if (row.status !== 'mapped' && row.status !== 'removed') problems.push(`${at} has status ${row.status}, not mapped or removed`);
    if (row.spec && !exists(row.spec)) problems.push(`${at} names the spec ${row.spec}, which does not exist`);
    if (!row.spec && !row.replacement?.trim() && !row.note?.trim()) problems.push(`${at} names no spec, replacement or note`);
    for (const text of [row.replacement, row.note]) for (const [, named] of (text ?? '').matchAll(NAMED_PATH))
      if (!named.includes('*') && !exists(named)) problems.push(`${at} names ${named}, which does not exist`);
  }
  return problems;
}

/** Problems with the manifest: every root test is run, held, or mapped to the area spec that will retire it; each is
 *  classified once, run files exist, held groups say why, and the retirement map matches the tree. */
export function rootTestProblems(directory = root): string[] {
  const manifest = readRootTests(directory);
  const retirement = JSON.parse(fs.readFileSync(path.join(directory, 'scripts/legacy-retirement.json'), 'utf8')) as Retirement;
  const listed = retirement.tests.filter(row => TOOLING_AREAS.has(row.area) && /\.test\.mjs$/.test(row.legacy) && fs.existsSync(path.join(directory, row.legacy))).map(row => row.legacy);
  const awaitingArea = new Set(retirement.tests.filter(row => row.status === 'mapped' && row.spec && !TOOLING_AREAS.has(row.area)).map(row => row.legacy));
  const held = manifest.held.flatMap(group => group.files);
  const problems: string[] = [];
  const seen = new Map<string, number>();
  for (const file of [...manifest.run, ...held]) seen.set(file, (seen.get(file) ?? 0) + 1);
  for (const [file, count] of seen) if (count > 1) problems.push(`${file} is classified ${count} times`);
  for (const file of listed) if (!seen.has(file)) problems.push(`${file} is neither run nor held`);
  for (const name of fs.readdirSync(path.join(directory, 'test'))) {
    const file = `test/${name}`;
    if (name.endsWith('.test.mjs') && !seen.has(file) && !awaitingArea.has(file))
      problems.push(`${file} is neither run, held, nor mapped to an area spec in scripts/legacy-retirement.json`);
  }
  for (const file of manifest.run) if (!fs.existsSync(path.join(directory, file))) problems.push(`${file} is listed to run but does not exist`);
  for (const group of manifest.held) if (!group.reason?.trim() || !group.movedTo?.trim() || !group.files?.length) problems.push(`a held group needs files, a reason and where the behaviour moved: ${JSON.stringify(group).slice(0, 120)}`);
  return [...problems, ...retirementProblems(retirement, directory)];
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
