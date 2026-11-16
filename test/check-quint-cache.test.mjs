import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { gunzipSync, gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { modelClosure, openQuintCache, quintCacheSchema, recallRun, runKey, snapshotInputs, storeRun } from '../scripts/quint-cache.ts';
import { readJson, repositoryRoot } from '../scripts/quint-lib.ts';
import { scaledTimeout } from '../specs/quint/refinement/timeouts.mjs';

// A stand-in Quint: it records each launch, reads its model and imports from its working directory as Quint does,
// passes scenarios and simulations, finds every witness, and fails any model that says FAIL.
const fakeQuint = `
const fs = require('node:fs');
const path = require('node:path');
const [command, file, ...rest] = process.argv.slice(2);
const listing = directory => fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => entry.isDirectory()
  ? listing(path.join(directory, entry.name)).map(name => entry.name + '/' + name) : [entry.name]).sort();
fs.appendFileSync(process.env.FAKE_QUINT_LOG, JSON.stringify({command, cwd: process.cwd(), files: listing('.'), args: rest}) + '\\n');
const read = name => fs.readFileSync(path.resolve(name), 'utf8');
let text = read(file);
for (const match of text.matchAll(/from "([^"]+)"/g)) text += read(path.join(path.dirname(file), match[1] + '.qnt'));
if (/FAIL/.test(text)) { console.log('checker said no'); process.exit(1); }
if (command === 'verify') { console.log('[ok] No violation found (1ms).'); process.exit(0); }
if (command === 'test') {
  const match = rest.find(arg => arg.startsWith('--match=^(')).slice('--match=^('.length, -2);
  for (const name of match.split('|')) console.log('    ok ' + name + ' passed 1 test(s)');
  process.exit(0);
}
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
  // The pinned model checker a verify reaches, installed under its own QUINT_HOME.
  write('quint-home/apalache-dist-0.62.4/apalache/lib/apalache.jar', 'fixture jar');
  write('node_modules/@informalsystems/quint/dist/src/config.js', `const path = require('node:path');
exports.apalacheDistDir = version => path.join(process.env.QUINT_HOME, 'apalache-dist-' + version);`);
  const log = join(root, 'launches.jsonl');
  writeFileSync(log, '');
  const env = {...process.env, FAKE_QUINT_LOG: log, QUINT_HOME: join(root, 'quint-home')};
  for (const name of Object.keys(env)) if (name.startsWith('QUINT_') && name !== 'QUINT_HOME') delete env[name];
  delete env.ALPHA_QUINT_CACHE;
  delete env.ALPHA_QUINT_CACHE_DIR;
  const run = (args, extra = {}) => {
    const out = join(root, `receipt-${Math.random().toString(36).slice(2)}.json`);
    const result = spawnSync(process.execPath, ['scripts/check-quint.ts', ...args, `--out=${out}`], {cwd: root, encoding: 'utf8', env: {...env, ...extra}, timeout: scaledTimeout(60000)});
    return {status: result.status, output: result.stdout + result.stderr, receipt: readJson(out)};
  };
  const check = (...args) => run(args);
  const launches = () => readFileSync(log, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
  return {root, env, write, run, check, launches, append: (path, text) => appendFileSync(join(root, path), text)};
}

test('a run is reused until a file Quint reads, its arguments or its toolchain changes', {timeout: scaledTimeout(300000)}, () => {
  const f = fixture();
  try {

  const first = f.check('simulate', '--models=Fixture');
  assert.equal(first.status, 0, first.output);
  assert.equal(f.launches().length, 2, 'simulation and witness each launch Quint');
  assert.deepEqual(first.receipt.cache, {...first.receipt.cache, enabled: true, hits: 0, misses: 2, stored: 2});
  for (const launch of f.launches()) {
    assert.notEqual(launch.cwd, f.root, 'Quint runs in a sandbox');
    assert.deepEqual(launch.files, ['specs/quint/application/Dep.qnt', 'specs/quint/application/Fixture.qnt'],
      'the sandbox holds exactly the model and its imports: no manifest, unrelated model or checker file');
  }
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

  // Quint's environment can change a verdict (QUINT_RETRY_NONDET_SMALLER_THAN), and so can the time limit.
  assert.equal(f.run(['simulate', '--models=Fixture'], {QUINT_RETRY_NONDET_SMALLER_THAN: '1'}).status, 0);
  assert.equal(f.launches().length, 9, 'a different QUINT_* environment is a different run');
  assert.equal(f.check('simulate', '--models=Fixture', '--timeout=99').status, 0);
  assert.equal(f.launches().length, 11, 'a different time limit is a different run');
  assert.equal(f.check('simulate', '--models=Fixture', '--timeout=99').status, 0);
  assert.equal(f.launches().length, 11);

  // The cache can be bypassed.
  const bypass = f.check('simulate', '--models=Fixture', '--cache=off');
  assert.equal(bypass.status, 0);
  assert.equal(f.launches().length, 13);
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
    assert.notEqual(runKey(cache, ['verify', 'x', '--server-endpoint=127.0.0.1:1'], inputs, {limitSeconds: 1}), key, 'the runner is keyed');
    storeRun(cache, {schemaVersion: quintCacheSchema, key, argv: [], startedAt: '', finishedAt: '', status: 0, stdout: 'ok', stderr: ''});
    assert.equal(recallRun(cache, key)?.stdout, 'ok');
    const file = join(cache.dir, 'runs', readdirSync(join(cache.dir, 'runs'))[0]);
    writeFileSync(file, 'truncated');
    assert.equal(recallRun(cache, key), undefined);
    assert.equal(existsSync(file), false, 'a damaged entry is deleted');
  } finally { rmSync(f.root, {recursive: true, force: true}); }
});

test('a verify is keyed by its configuration and checker engine, and never remembers a foreign server', {timeout: scaledTimeout(300000)}, async () => {
  const f = fixture();
  const listener = createServer(socket => socket.destroy());
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const busy = `127.0.0.1:${listener.address().port}`;
  await new Promise(resolve => listener.close(resolve));
  try {
    const verify = (...args) => f.run(['verify', '--models=Fixture', `--server-endpoint=${busy}`, ...args]);
    const first = verify();
    assert.equal(first.status, 0, first.output);
    assert.equal(f.launches().length, 1);
    assert.deepEqual(f.launches()[0].files, ['specs/quint/application/Dep.qnt', 'specs/quint/application/Fixture.qnt', 'specs/quint/tlc.json']);
    assert.equal(first.receipt.cache.stored, 1);
    assert.equal(verify().receipt.cache.hits, 1);
    assert.equal(f.launches().length, 1);

    f.write('specs/quint/tlc.json', '{"workers": "1"}');
    assert.equal(verify().status, 0);
    assert.equal(f.launches().length, 2, 'the TLC configuration is keyed');
    f.write('quint-home/apalache-dist-0.62.4/apalache/lib/apalache.jar', 'another jar');
    assert.equal(verify().status, 0);
    assert.equal(f.launches().length, 3, 'the model checker distribution is keyed');

    // Without an installed distribution there is no engine identity: run, and remember nothing.
    rmSync(join(f.root, 'quint-home'), {recursive: true, force: true});
    for (const launches of [4, 5]) {
      const unkeyed = verify();
      assert.equal(unkeyed.status, 0, unkeyed.output);
      assert.equal(f.launches().length, launches);
      assert.equal(unkeyed.receipt.cache.stored, 0);
      assert.equal(unkeyed.receipt.results[0].cache, undefined);
    }
    f.write('quint-home/apalache-dist-0.62.4/apalache/lib/apalache.jar', 'fixture jar');

    // A server already listening was not started by the checker: its answer is used and not remembered.
    f.write('specs/quint/application/Dep.qnt', 'module Dep {\n  run depTest = true\n}\n// foreign\n');
    const server = createServer(socket => socket.destroy());
    server.listen(Number(busy.split(':')[1]), '127.0.0.1');
    await once(server, 'listening');
    try {
      const foreign = await new Promise(resolve => {
        const out = join(f.root, 'foreign.json');
        const child = spawn(process.execPath, ['scripts/check-quint.ts', 'verify', '--models=Fixture', `--server-endpoint=${busy}`, `--out=${out}`],
          {cwd: f.root, env: f.env, stdio: 'ignore'});
        child.on('close', status => resolve({status, receipt: readJson(out)}));
      });
      assert.equal(foreign.status, 0);
      assert.equal(foreign.receipt.cache.stored, 0);
      assert.equal(foreign.receipt.results[0].cache.reason, 'pre-existing checker server');
    } finally { await new Promise(resolve => server.close(resolve)); }
    assert.equal(f.launches().length, 6);
    assert.equal(verify().receipt.cache.stored, 1, 'the same run with no foreign server is remembered');
    assert.equal(f.launches().length, 7);
  } finally { rmSync(f.root, {recursive: true, force: true}); }
});

test('a model whose imports cannot be read fails alone; other models still run', {timeout: scaledTimeout(120000)}, () => {
  const f = fixture();
  try {
    f.write('specs/quint/application/Fixture.qnt', 'module Fixture {\n  import Dep.* from "./Missing"\n  val ReachedWitness = true\n  run exampleTest = true\n}\n');
    const result = f.check('test', '--models=Fixture,Unrelated');
    assert.equal(result.status, 1, result.output);
    const rows = Object.fromEntries(result.receipt.results.map(row => [row.model, row]));
    assert.equal(rows.Fixture.passed, false);
    assert.match(rows.Fixture.error, /Cannot read the model's inputs/);
    assert.equal(rows.Unrelated.passed, true);
    assert.equal(result.receipt.error, undefined);
    assert.deepEqual(f.launches().map(launch => launch.files), [['specs/quint/application/Unrelated.qnt']]);
  } finally { rmSync(f.root, {recursive: true, force: true}); }
});

test('remembered output is judged again: one the current checker would reject reruns instead of passing as cached', {timeout: scaledTimeout(120000)}, () => {
  const f = fixture();
  try {
    const first = f.check('test', '--models=Fixture');
    assert.equal(first.status, 0, first.output);
    assert.equal(f.launches().length, 1);
    // The entry keeps its key and exit status but its output no longer names the declared scenario, as when a stricter
    // checker or a changed expectation would reject what an older one accepted.
    const runs = join(f.root, '.cache/quint/runs');
    const [name] = readdirSync(runs);
    const entry = JSON.parse(gunzipSync(readFileSync(join(runs, name))).toString('utf8'));
    assert.equal(entry.status, 0);
    assert.match(entry.stdout, /ok exampleTest passed/);
    writeFileSync(join(runs, name), gzipSync(JSON.stringify({...entry, stdout: 'nothing to see\n'})));
    const second = f.check('test', '--models=Fixture');
    assert.equal(second.status, 0, second.output);
    assert.equal(f.launches().length, 2, 'the rejected remembered output is not reused: Quint runs again');
    assert.doesNotMatch(second.output, /\(cached\)/);
    assert.deepEqual([second.receipt.cache.hits, second.receipt.cache.misses, second.receipt.cache.stored], [0, 1, 1]);
    assert.equal(second.receipt.results[0].cache.hit, false);
    assert.match(second.receipt.results[0].output, /ok exampleTest passed/);
  } finally { rmSync(f.root, {recursive: true, force: true}); }
});

test('a cache directory with files tracked by git is refused, whatever they say', {timeout: scaledTimeout(120000)}, () => {
  const f = fixture();
  try {
    const first = f.check('test', '--models=Fixture');
    assert.equal(first.status, 0, first.output);
    const git = (...args) => {
      const result = spawnSync('git', args, {cwd: f.root, encoding: 'utf8'});
      assert.equal(result.status, 0, result.stderr);
    };
    git('init', '-q');
    git('add', 'specs');
    git('-c', 'user.name=fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture');
    assert.equal(f.check('test', '--models=Fixture').receipt.cache.hits, 1, 'an untracked cache in a checkout is used');
    // The run cache guards itself, apart from the registry's metadata check that a full check reaches first: open it
    // alone, in a fresh process, as any caller of the run cache would.
    f.write('scripts/open-run-cache.ts', `import { openQuintCache } from './quint-cache.ts';
console.log('opened ' + openQuintCache(process.cwd(), true).enabled);
`);
    const openRunCache = () => spawnSync(process.execPath, ['scripts/open-run-cache.ts'], {cwd: f.root, encoding: 'utf8', env: f.env});
    const untracked = openRunCache();
    assert.equal(untracked.status, 0, untracked.stderr);
    assert.match(untracked.stdout, /opened true/);
    // A committed entry (here a genuine one, force-added past the ignore rule) carries no provenance.
    git('add', '-f', '.cache/quint/runs');
    const direct = openRunCache();
    assert.notEqual(direct.status, 0, direct.stdout);
    assert.match(direct.stderr, /Refusing the Quint cache .*git tracks 1 file\(s\) in it, such as \.cache\/quint\/runs\/run-/);
    git('add', '-f', '.cache/quint');
    const refused = spawnSync(process.execPath, ['scripts/check-quint.ts', 'test', '--models=Fixture', `--out=${join(f.root, 'refused.json')}`],
      {cwd: f.root, encoding: 'utf8', env: f.env, timeout: scaledTimeout(60000)});
    assert.notEqual(refused.status, 0);
    assert.match(refused.stdout + refused.stderr, /Refusing the Quint cache .*git tracks/);
    assert.doesNotMatch(refused.stdout + refused.stderr, /PASS/);
    assert.equal(f.launches().length, 1);
    // A directory moved elsewhere in the checkout is inspected the same way.
    const moved = spawnSync(process.execPath, ['scripts/check-quint.ts', 'test', '--models=Fixture', `--out=${join(f.root, 'moved.json')}`],
      {cwd: f.root, encoding: 'utf8', env: {...f.env, ALPHA_QUINT_CACHE_DIR: '.cache/quint/runs'}, timeout: scaledTimeout(60000)});
    assert.notEqual(moved.status, 0);
    assert.match(moved.stdout + moved.stderr, /Refusing the Quint cache/);
    // Without the cache nothing is read from it, and the check runs.
    const bypass = f.check('test', '--models=Fixture', '--cache=off');
    assert.equal(bypass.status, 0, bypass.output);
    assert.equal(f.launches().length, 2);
  } finally { rmSync(f.root, {recursive: true, force: true}); }
});

test('a remembered metadata validation vouches only by its contents', {timeout: scaledTimeout(120000)}, () => {
  const f = fixture();
  try {
    // Fixture declares an unknown proof backend, which validation rejects.
    const manifest = 'specs/quint/application/manifest.json';
    const models = JSON.parse(readFileSync(join(f.root, manifest), 'utf8'));
    models[0].verifyBackend = 'bogus';
    f.write(manifest, JSON.stringify(models));
    f.write('scripts/load-models.ts', `import { readFileSync } from 'node:fs';
import { loadModels, quintMetadataMarker } from './quint-lib.ts';
if (process.argv[2] === 'marker') {
  const [entry] = JSON.parse(readFileSync('${manifest}', 'utf8'));
  // As the registry reads it: a family and its source list.
  console.log(JSON.stringify(quintMetadataMarker({...entry, family: 'application', sources: []}, readFileSync(entry.path, 'utf8'))));
} else console.log('loaded ' + loadModels().length);
`);
    const node = (...args) => spawnSync(process.execPath, ['scripts/load-models.ts', ...args], {cwd: f.root, encoding: 'utf8', env: f.env});
    const marker = JSON.parse(node('marker').stdout);
    assert.ok(marker.contents.includes(marker.file.split('metadata-').at(-1)), 'the marker names the key it vouches for');
    const rejected = node();
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /Invalid verifyBackend in Fixture/);
    assert.equal(existsSync(marker.file), false, 'a failed validation is never remembered');

    // An empty marker at the right path, as a restored or committed file could be, does not skip validation.
    mkdirSync(dirname(marker.file), {recursive: true});
    writeFileSync(marker.file, '');
    const empty = node();
    assert.notEqual(empty.status, 0, empty.stdout);
    assert.match(empty.stderr, /Invalid verifyBackend in Fixture/);
    // Control: the genuine contents at that path are what a remembered success looks like, and they are honoured.
    writeFileSync(marker.file, marker.contents);
    const remembered = node();
    assert.equal(remembered.status, 0, remembered.stderr);
    assert.match(remembered.stdout, /loaded 3/);
  } finally { rmSync(f.root, {recursive: true, force: true}); }
});
