import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { modelClosure, openQuintCache, recallRun, runKey, snapshotInputs, storeRun } from '../scripts/quint-cache.ts';
import { readJson, repositoryRoot } from '../scripts/quint-lib.ts';
import { scaledTimeout } from '../specs/quint/refinement/timeouts.mjs';

// A stand-in Quint: it records each launch, reads its model and imports from its working directory as Quint does,
// passes scenarios and simulations, finds every witness, and fails any model that says FAIL.
const fakeQuint = `
const fs = require('node:fs');
const path = require('node:path');
const [command, file, ...rest] = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_QUINT_LOG, JSON.stringify({command, cwd: process.cwd(), args: rest}) + '\\n');
const read = name => fs.readFileSync(path.resolve(name), 'utf8');
let text = read(file);
for (const match of text.matchAll(/from "([^"]+)"/g)) text += read(path.join(path.dirname(file), match[1] + '.qnt'));
if (/FAIL/.test(text)) { console.log('checker said no'); process.exit(1); }
if (command === 'test') { console.log('    ok exampleTest passed 1 test(s)'); process.exit(0); }
if (rest.some(arg => arg.startsWith('--invariant=not('))) {
  console.log('[violation] Found an issue (1ms).');
  console.error('error: Invariant violated');
  process.exit(1);
}
console.log('[ok] No violation found (1ms).');
`;

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'alpha-quint-cache-'));
  const write = (path, contents) => {
    mkdirSync(dirname(join(root, path)), {recursive: true});
    writeFileSync(join(root, path), contents);
  };
  for (const name of ['check-quint.ts', 'quint-lib.ts', 'quint-cache.ts', 'sha256.ts', 'upstream-pin.ts']) {
    mkdirSync(join(root, 'scripts'), {recursive: true});
    copyFileSync(join(repositoryRoot, 'scripts', name), join(root, 'scripts', name));
  }
  const fixtureModel = {module: 'Fixture', path: 'specs/quint/application/Fixture.qnt', init: 'init', step: 'step',
    invariant: 'safety', tests: ['exampleTest'], witnesses: ['ReachedWitness']};
  const dependency = {module: 'Dep', path: 'specs/quint/application/Dep.qnt', init: 'init', step: 'step',
    invariant: 'safety', tests: ['depTest']};
  write(fixtureModel.path, 'module Fixture {\n  import Dep.* from "./Dep"\n  val ReachedWitness = true\n  run exampleTest = true\n}\n');
  write(dependency.path, 'module Dep {\n  run depTest = true\n}\n');
  write('specs/quint/application/Unrelated.qnt', 'module Unrelated {\n  run unrelatedTest = true\n}\n');
  const unrelated = {module: 'Unrelated', path: 'specs/quint/application/Unrelated.qnt', init: 'init', step: 'step',
    invariant: 'safety', tests: ['unrelatedTest']};
  for (const family of ['application', 'services', 'native', 'legacy'])
    write(`specs/quint/${family}/manifest.json`, JSON.stringify(family === 'application' ? [fixtureModel, dependency, unrelated] : []));
  write('upstream.lock.json', JSON.stringify({commit: 'fixture'}));
  write('bun.lock', '{}');
  write('specs/quint/tlc.json', '{}');
  write('node_modules/@informalsystems/quint/package.json', JSON.stringify({name: '@informalsystems/quint', version: '0.33.1'}));
  write('node_modules/@informalsystems/quint/dist/src/cli.js', fakeQuint);
  const log = join(root, 'launches.jsonl');
  writeFileSync(log, '');
  const env = {...process.env, FAKE_QUINT_LOG: log};
  delete env.ALPHA_QUINT_CACHE;
  delete env.ALPHA_QUINT_CACHE_DIR;
  const check = (...args) => {
    const out = join(root, `receipt-${Math.random().toString(36).slice(2)}.json`);
    const result = spawnSync(process.execPath, ['scripts/check-quint.ts', ...args, `--out=${out}`], {cwd: root, encoding: 'utf8', env, timeout: scaledTimeout(60000)});
    return {status: result.status, output: result.stdout + result.stderr, receipt: readJson(out)};
  };
  const launches = () => readFileSync(log, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
  return {root, write, check, launches, append: (path, text) => appendFileSync(join(root, path), text)};
}

test('a run is reused until a file Quint reads, its arguments or its toolchain changes', {timeout: scaledTimeout(300000)}, () => {
  const f = fixture();
  try {

  const first = f.check('simulate', '--models=Fixture');
  assert.equal(first.status, 0, first.output);
  assert.equal(f.launches().length, 2, 'simulation and witness each launch Quint');
  assert.deepEqual(first.receipt.cache, {...first.receipt.cache, enabled: true, hits: 0, misses: 2, stored: 2});
  for (const launch of f.launches()) assert.notEqual(launch.cwd, f.root, 'Quint runs in a sandbox holding only its inputs');
  assert.ok(first.receipt.results.every(row => row.passed && row.cache.hit === false));

  const second = f.check('simulate', '--models=Fixture');
  assert.equal(second.status, 0, second.output);
  assert.equal(f.launches().length, 2, 'an unchanged model launches nothing');
  assert.deepEqual([second.receipt.cache.hits, second.receipt.cache.misses], [2, 0]);
  assert.ok(second.receipt.results.every(row => row.passed && row.cache.hit === true && row.cache.recordedAt));
  assert.match(second.output, /PASS Fixture simulation \(cached\)/);

  // A comment in an imported model is still a byte Quint reads.
  f.append('specs/quint/application/Dep.qnt', '// edited\n');
  assert.equal(f.check('simulate', '--models=Fixture').status, 0);
  assert.equal(f.launches().length, 4, 'an imported model change reruns its importer');

  // Changing an unrelated model changes nothing for this one.
  f.append('specs/quint/application/Unrelated.qnt', '// edited\n');
  assert.equal(f.check('simulate', '--models=Fixture').status, 0);
  assert.equal(f.launches().length, 4);

  // Different arguments are a different run: the witness search keeps its own floor of samples, so only the
  // simulation runs again.
  assert.equal(f.check('simulate', '--models=Fixture', '--samples=7').status, 0);
  assert.equal(f.launches().length, 5);

  // A different Quint is a different run.
  f.append('node_modules/@informalsystems/quint/dist/src/cli.js', '// rebuilt\n');
  assert.equal(f.check('simulate', '--models=Fixture').status, 0);
  assert.equal(f.launches().length, 7);

  // The cache can be bypassed.
  const bypass = f.check('simulate', '--models=Fixture', '--cache=off');
  assert.equal(bypass.status, 0);
  assert.equal(f.launches().length, 9);
  assert.equal(bypass.receipt.cache.enabled, false);
  } finally { rmSync(f.root, {recursive: true, force: true}); }
});

test('a failing run is never remembered', {timeout: scaledTimeout(120000)}, () => {
  const f = fixture();
  try {
  f.append('specs/quint/application/Dep.qnt', '// FAIL\n');
  for (const launches of [1, 2]) {
    const failed = f.check('test', '--models=Fixture');
    assert.equal(failed.status, 1, failed.output);
    assert.equal(f.launches().length, launches, `every check of a failing model runs Quint again\n${failed.output}`);
    assert.equal(failed.receipt.cache.stored, 0);
    assert.equal(failed.receipt.results[0].passed, false);
  }
  } finally { rmSync(f.root, {recursive: true, force: true}); }
});

test('a model is checked against its own transitive imports only', () => {
  const f = fixture();
  try {
    assert.deepEqual(modelClosure(f.root, 'specs/quint/application/Fixture.qnt'),
      ['specs/quint/application/Dep.qnt', 'specs/quint/application/Fixture.qnt']);
    f.write('specs/quint/application/Escape.qnt', 'module Escape {\n  import X.* from "../../../../outside"\n}\n');
    assert.throws(() => modelClosure(f.root, 'specs/quint/application/Escape.qnt'), /escapes the repository/);
  } finally { rmSync(f.root, {recursive: true, force: true}); }
});

test('keys ignore the checker server address and reject damaged entries', () => {
  const f = fixture();
  try {
    const cache = openQuintCache(f.root, true);
    const inputs = snapshotInputs(f.root, 'specs/quint/application/Fixture.qnt');
    const key = runKey(cache, ['verify', 'x', '--server-endpoint=127.0.0.1:1'], inputs);
    assert.equal(runKey(cache, ['verify', 'x', '--server-endpoint=127.0.0.1:2'], inputs), key);
    assert.notEqual(runKey(cache, ['verify', 'x', '--max-steps=7'], inputs), key);
    storeRun(cache, {schemaVersion: 1, key, argv: [], startedAt: '', finishedAt: '', status: 0, stdout: 'ok', stderr: ''});
    assert.equal(recallRun(cache, key)?.stdout, 'ok');
    const file = join(cache.dir, 'runs', readdirSync(join(cache.dir, 'runs'))[0]);
    writeFileSync(file, 'truncated');
    assert.equal(recallRun(cache, key), undefined);
    assert.equal(existsSync(file), false, 'a damaged entry is deleted');
  } finally { rmSync(f.root, {recursive: true, force: true}); }
});
