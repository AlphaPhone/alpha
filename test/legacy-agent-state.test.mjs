// apps/app/spec/platform/storage.md, "Story: Keep what the earlier on-device agent stored"; "The earlier agent's store and runtime are moved aside by rename, and never opened, changed or deleted"
// Compiles the production LegacyAgentState.java on the host JVM and runs it over app files directories laid out as the
// earlier Alpha left them. Host-JVM evidence only: it is not an APK, emulator or device run.
import assert from 'node:assert/strict';
import {chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import test from 'node:test';
import {jvmSkip, nativeSource, runJvm} from './fixtures/jvm-tools.mjs';

const skip = jvmSkip('javac');
const ACCOUNT = 'a'.repeat(64);

const DRIVER = `package ai.alphacompute.alphaphone;
public final class LegacyAgentStateDriver {
 public static void main(String[] args) {
  if (args[0].equals("laws")) {
   for (boolean s : new boolean[]{false, true}) for (boolean a : new boolean[]{false, true}) for (boolean r : new boolean[]{false, true})
    System.out.println(s + " " + a + " " + r + " " + LegacyAgentState.moveOf(s, a, r));
   return;
  }
  for (LegacyAgentState.Outcome outcome : LegacyAgentState.moveAside(java.nio.file.Paths.get(args[1]))) System.out.println(outcome);
 }
}
`;

let compiled;
function driver() {
  if (!compiled) {
    compiled = mkdtempSync(join(tmpdir(), 'alpha-legacy-agent-driver-'));
    writeFileSync(join(compiled, 'LegacyAgentStateDriver.java'), DRIVER);
  }
  return [nativeSource('LegacyAgentState.java'), join(compiled, 'LegacyAgentStateDriver.java')];
}
const run = (...args) => runJvm(driver(), 'ai.alphacompute.alphaphone.LegacyAgentStateDriver', {args}).split('\n').filter(Boolean);
const moveAside = files => run('move', files);

function write(path, body) {
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, body);
}

/** Everything under `root` as {relative path: contents or '->target' or '/'}, links not followed. */
function tree(root) {
  const out = {};
  const walk = relative => {
    for (const name of readdirSync(join(root, relative)).sort()) {
      const path = join(relative, name), status = lstatSync(join(root, path));
      if (status.isSymbolicLink()) out[path] = '->' + readlinkSync(join(root, path));
      else if (status.isDirectory()) { out[path + '/'] = '/'; walk(path); }
      else out[path] = readFileSync(join(root, path), 'utf8');
    }
  };
  if (existsSync(root)) walk('');
  return out;
}

/** A files directory as the earlier Alpha left it, with one account directory a newer build already made. */
function legacyPhone() {
  const files = mkdtempSync(join(tmpdir(), 'alpha-legacy-agent-'));
  write(join(files, '.eliza/workspace/.elizadb/PG_VERSION'), '17\n');
  write(join(files, '.eliza/workspace/.elizadb/base/1/1259'), 'conversations');
  write(join(files, '.eliza/workspace/AGENTS.md'), 'workspace file');
  write(join(files, '.eliza/eliza.json'), '{"agents":{}}');
  write(join(files, '.eliza/smthrs/engine.db'), 'workflow runs');
  write(join(files, '.eliza/.vault-pglite/PG_VERSION'), '17\n');
  write(join(files, '.eliza/runtime-installation-id'), 'installation');
  write(join(files, '.eliza/alpha-google-agent-access.json'), '{"version":1,"gmailChanges":true,"calendarEdits":false}');
  write(join(files, 'agent/agent-bundle.js'), 'bundle');
  write(join(files, 'agent/launch.sh'), '#!/bin/sh');
  write(join(files, 'agent/.apk-stamp'), '1234');
  write(join(files, 'agent/agent.log'), 'turn log');
  write(join(files, 'agent/arm64-v8a/bun'), 'bun');
  write(join(files, `agent/${ACCOUNT}/store-v4/PG_VERSION`), '17\n');
  write(join(files, `agent/${ACCOUNT}/agent-id`), 'new agent');
  return files;
}

const kept = {
  '.eliza/eliza.json': '{"agents":{}}',
  '.eliza/smthrs/engine.db': 'workflow runs',
  '.eliza/.vault-pglite/PG_VERSION': '17\n',
  '.eliza/runtime-installation-id': 'installation',
  '.eliza/alpha-google-agent-access.json': '{"version":1,"gmailChanges":true,"calendarEdits":false}',
  [`agent/${ACCOUNT}/store-v4/PG_VERSION`]: '17\n',
  [`agent/${ACCOUNT}/agent-id`]: 'new agent',
};

test('the spec laws hold for every move the native code can decide', {skip}, () => {
  const rows = run('laws').map(line => line.split(' '));
  assert.equal(rows.length, 8);
  for (const [source, archive, renamed, move] of rows) {
    const [s, a, r] = [source, archive, renamed].map(value => value === 'true');
    if (move === 'MOVED_ASIDE') assert.ok(s && !a && r, 'a source moves only into a free archive name');
    if (a) assert.notEqual(move, 'MOVED_ASIDE', 'an archived entry is never written over');
    if (s && !r) assert.equal(move, 'KEPT_IN_PLACE', 'a failed rename keeps the source in place');
    if (!s) assert.equal(move, 'NOTHING_TO_MOVE');
  }
});

test('the earlier store and runtime are moved aside whole, and nothing else is touched', {skip}, () => {
  const files = legacyPhone();
  try {
    const before = tree(files);
    const lines = moveAside(files);
    assert.deepEqual(lines, [
      '.eliza/workspace MOVED_ASIDE',
      'agent/.apk-stamp MOVED_ASIDE',
      'agent/agent.log MOVED_ASIDE',
      'agent/arm64-v8a MOVED_ASIDE',
      'agent/launch.sh MOVED_ASIDE',
      'agent/agent-bundle.js MOVED_ASIDE',
    ]);
    const after = tree(files);
    for (const [path, body] of Object.entries(kept)) assert.equal(after[path], body, `${path} stays where it was`);
    for (const [path, body] of Object.entries(before)) {
      if (path.startsWith('.eliza/workspace/')) assert.equal(after['agent-legacy/eliza-workspace/' + path.slice('.eliza/workspace/'.length)], body, path);
      else if (path.startsWith('agent/') && !path.startsWith(`agent/${ACCOUNT}`)) assert.equal(after['agent-legacy/payload/' + path.slice('agent/'.length)], body, path);
      else assert.equal(after[path], body, path);
    }
    assert.equal(Object.values(after).filter(body => body !== '/').length, Object.values(before).filter(body => body !== '/').length, 'no file was added or lost');
    assert.equal(lstatSync(join(files, 'agent-legacy')).mode & 0o777, 0o700);
    assert.deepEqual(moveAside(files), [], 'a later launch finds nothing to move');
    assert.deepEqual(tree(files), after);
  } finally { rmSync(files, {recursive: true, force: true}); }
});

test('an entry the archive already holds is never written over, and the runtime marker waits for it', {skip}, () => {
  const files = legacyPhone();
  try {
    write(join(files, 'agent-legacy/eliza-workspace/kept'), 'earlier archive');
    write(join(files, 'agent-legacy/payload/launch.sh'), 'earlier launch');
    const lines = moveAside(files);
    assert.deepEqual(lines, [
      '.eliza/workspace KEPT_IN_PLACE (archive holds one)',
      'agent/.apk-stamp MOVED_ASIDE',
      'agent/agent.log MOVED_ASIDE',
      'agent/arm64-v8a MOVED_ASIDE',
      'agent/launch.sh KEPT_IN_PLACE (archive holds one)',
      'agent/agent-bundle.js KEPT_IN_PLACE (runtime entries left)',
    ]);
    const after = tree(files);
    assert.equal(after['agent-legacy/eliza-workspace/kept'], 'earlier archive');
    assert.equal(after['agent-legacy/payload/launch.sh'], 'earlier launch');
    assert.equal(after['.eliza/workspace/.elizadb/base/1/1259'], 'conversations');
    assert.equal(after['agent/launch.sh'], '#!/bin/sh');
    assert.equal(after['agent/agent-bundle.js'], 'bundle');
    assert.deepEqual(moveAside(files), [
      '.eliza/workspace KEPT_IN_PLACE (archive holds one)',
      'agent/launch.sh KEPT_IN_PLACE (archive holds one)',
      'agent/agent-bundle.js KEPT_IN_PLACE (runtime entries left)',
    ], 'the next launch looks again and still writes nothing over');
  } finally { rmSync(files, {recursive: true, force: true}); }
});

test('links are moved as links or not entered, never followed', {skip}, () => {
  const files = legacyPhone(), outside = mkdtempSync(join(tmpdir(), 'alpha-legacy-outside-'));
  try {
    write(join(outside, 'workspace/.elizadb/PG_VERSION'), 'outside');
    write(join(outside, 'secret'), 'outside file');
    rmSync(join(files, '.eliza'), {recursive: true});
    symlinkSync(outside, join(files, '.eliza'));
    symlinkSync(join(outside, 'secret'), join(files, 'agent/linked'));
    const lines = moveAside(files);
    assert.ok(lines.includes('.eliza/workspace KEPT_IN_PLACE (linked)'));
    assert.ok(lines.includes('agent/linked MOVED_ASIDE'));
    assert.equal(readlinkSync(join(files, 'agent-legacy/payload/linked')), join(outside, 'secret'));
    assert.deepEqual(tree(outside), {'secret': 'outside file', 'workspace/': '/', 'workspace/.elizadb/': '/', 'workspace/.elizadb/PG_VERSION': 'outside'});
  } finally { rmSync(files, {recursive: true, force: true}); rmSync(outside, {recursive: true, force: true}); }
});

test('a phone the earlier agent never ran on, or whose runtime already left, gets no archive', {skip}, () => {
  const files = mkdtempSync(join(tmpdir(), 'alpha-legacy-fresh-'));
  try {
    assert.deepEqual(moveAside(files), []);
    write(join(files, `agent/${ACCOUNT}/agent-id`), 'new agent');
    write(join(files, 'agent/stray'), 'not the earlier runtime');
    assert.deepEqual(moveAside(files), [], 'without the runtime marker nothing in files/agent is earlier runtime');
    assert.equal(existsSync(join(files, 'agent-legacy')), false);
    assert.equal(readFileSync(join(files, 'agent/stray'), 'utf8'), 'not the earlier runtime');
  } finally { rmSync(files, {recursive: true, force: true}); }
});

test('an unusable archive or a failed rename leaves every source in place', {skip}, () => {
  const files = legacyPhone();
  try {
    const before = tree(files);
    write(join(files, 'agent-legacy'), 'not a directory');
    assert.deepEqual(moveAside(files), [
      '.eliza/workspace KEPT_IN_PLACE (archive unusable)',
      'agent/.apk-stamp KEPT_IN_PLACE (archive unusable)',
      'agent/agent-bundle.js KEPT_IN_PLACE (archive unusable)',
      'agent/agent.log KEPT_IN_PLACE (archive unusable)',
      'agent/arm64-v8a KEPT_IN_PLACE (archive unusable)',
      'agent/launch.sh KEPT_IN_PLACE (archive unusable)',
    ]);
    assert.deepEqual(tree(files), {...before, 'agent-legacy': 'not a directory'});
    rmSync(join(files, 'agent-legacy'));
    if (process.getuid?.() === 0) return; // root renames out of a read-only directory
    chmodSync(join(files, 'agent'), 0o500);
    try {
      const lines = moveAside(files);
      assert.equal(lines.at(-1), 'agent/agent-bundle.js KEPT_IN_PLACE (runtime entries left)');
      assert.ok(lines.filter(line => line.startsWith('agent/') && !line.includes('agent-bundle')).every(line => line.includes('KEPT_IN_PLACE (rename failed')), lines.join('\n'));
    } finally { chmodSync(join(files, 'agent'), 0o700); }
    for (const [path, body] of Object.entries(before)) if (path.startsWith('agent/')) assert.equal(tree(files)[path], body, path);
  } finally { rmSync(files, {recursive: true, force: true}); }
});

test('the launch moves the earlier state aside first and is never refused by it', () => {
  const service = readFileSync(nativeSource('ElizaAgentService.java'), 'utf8');
  const launch = service.slice(service.indexOf('@Override protected void configureLaunch('), service.indexOf('/** Starts the resident unless'));
  assert.ok(launch.indexOf('moveLegacyStateAside();') > 0, 'configureLaunch moves the earlier state aside');
  assert.ok(launch.indexOf('moveLegacyStateAside();') < launch.indexOf('AlphaLocalAgentPlugin.configureLaunch('), 'before the launch environment is built');
  const move = launch.slice(launch.indexOf('private void moveLegacyStateAside()'));
  assert.doesNotMatch(move, /LaunchRefused|throw /, 'the move never refuses the launch');
  assert.match(move, /catch \(RuntimeException/);
});

test.after(() => { if (compiled) rmSync(compiled, {recursive: true, force: true}); });
