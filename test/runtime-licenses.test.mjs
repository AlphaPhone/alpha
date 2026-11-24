// Runtime notice enumeration on a synthetic staged payload; not APK or legal evidence.
// Policy P-09: a copyleft, unknown or text-less package is listed and flagged; only broken input fails.
// The staged payload is upstream's (scripts/stage-agent-runtime.ts): agent.mjs with the bundle's manifest.json
// (every bundled package by name and version) and inventory.json, and the workflow worker's dependencies.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RUNTIME_ENTRY, collectNotices, finishEntry, loadTemplates, packagedRuntimePresent, runtimeEntries, ROOT, UNKNOWN, UNVERIFIED } from '../scripts/generate-licenses.ts';
import { licenceFlagLines } from '../scripts/licence-policy.ts';

const canonicalTexts = { MIT: 'MIT terms', ISC: 'ISC terms', 'Apache-2.0': 'Apache terms', 'BSD-3-Clause': 'BSD terms' };
const templates = { mit: 'MIT terms', isc: 'ISC terms', apache: 'Apache terms', canonical: expression => canonicalTexts[expression] ?? '' };
const NODE = { version: '26.13.1', ndk: '29.0.14206865', buildCommit: 'c'.repeat(40), entries: [{ abi: 'arm64-v8a' }, { abi: 'x86_64' }] };
const write = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
/** pnpm's store directory for name@version under a node_modules root. */
const stored = (name, version) => `node_modules/.pnpm/${name.replace('/', '+')}@${version}/node_modules/${name}`;

function stagedRuntime(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-runtime-notices-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const agent = path.join(root, 'android/app/src/main/assets/agent');
  // The pinned upstream checkout: its workspace packages and its own pnpm store.
  const source = path.join(root, 'vendor/eliza');
  write(path.join(source, 'packages/os/aosp/runtime/node.lock.json'), JSON.stringify(NODE));
  write(path.join(agent, 'agent.mjs'), 'var x=1;console.log(x);');
  write(path.join(agent, 'inventory.json'), JSON.stringify({ schema: 1, files: [{ path: 'agent.mjs', sha256: '0'.repeat(64), size: 24 }] }));
  write(path.join(agent, 'alpha-source.json'), JSON.stringify({ base: 'a'.repeat(40) }));
  const pkg = (dir, manifest, files = {}) => {
    write(path.join(dir, 'package.json'), JSON.stringify(manifest));
    for (const [file, text] of Object.entries(files)) write(path.join(dir, file), text);
  };
  pkg(path.join(source, stored('zod', '4.1.0')), { name: 'zod', version: '4.1.0', license: 'MIT' }, { LICENSE: 'zod license text' });
  pkg(path.join(source, stored('@scope/pkg', '2.0.0').replace('@2.0.0/', '@2.0.0_abc/')), { name: '@scope/pkg', version: '2.0.0', license: { type: 'ISC' } });
  pkg(path.join(source, 'packages/hoisted'), { name: 'hoisted', version: '0.1.0', license: 'Apache-2.0' });
  pkg(path.join(source, stored('effect', '4.0.0')), { name: 'effect', version: '4.0.0', license: 'MIT' });
  const bundled = [{ name: 'zod', version: '4.1.0' }, { name: '@scope/pkg', version: '2.0.0' }, { name: 'hoisted', version: '0.1.0' }];
  const recordBundle = (packages = bundled) => write(path.join(agent, 'manifest.json'), JSON.stringify({ packages }));
  recordBundle();
  write(path.join(agent, 'workflow-worker/dependencies.json'), JSON.stringify({ zod: '4.1.0', effect: '4.0.0' }));
  return { root, agent, source, bundled, recordBundle, pkg };
}

test('a PACKAGED runtime lists Node.js and every bundled agent and worker package', t => {
  const { root, agent, source } = stagedRuntime(t);
  assert.equal(packagedRuntimePresent(root), true);
  const errors = [];
  const entries = runtimeEntries(root, templates, errors, { agentDir: agent, sourceDir: source });
  assert.deepEqual(errors, []);
  const byName = Object.fromEntries(entries.map(entry => [entry.name, entry]));
  const node = byName[RUNTIME_ENTRY];
  assert.ok(node, 'Node.js entry');
  assert.equal(node.version, '26.13.1 (nodejs/node v26.13.1)');
  assert.match(node.text, /libeliza_node\.so for arm64-v8a and x86_64/);
  assert.match(node.text, /MIT License:\n\nMIT terms/);
  assert.match(node.text, /Corresponding source: https:\/\/github\.com\/nodejs\/node\/tree\/v26\.13\.1\./);
  assert.equal(node.source, 'https://github.com/nodejs/node/tree/v26.13.1');
  assert.doesNotMatch(node.text, /distributor must|(?:bun|pnpm) run/);
  assert.equal(node.license, UNVERIFIED);
  assert.deepEqual(finishEntry(node).flags, ['unverified']);
  assert.equal(byName.zod.license, 'MIT');
  assert.deepEqual([byName.zod.textSource, finishEntry(byName.zod).flags], [undefined, []]);
  // A package or worker dependency with no licence file gets the canonical text of its declared licence, and a flag.
  for (const name of ['@scope/pkg', 'hoisted', 'effect']) assert.deepEqual([byName[name].textSource, finishEntry(byName[name]).flags], ['spdx-canonical', ['licence-text-missing-from-package']], name);
  assert.match(byName.hoisted.text, /ships no license file\. Its package\.json declares the Apache-2\.0 License\. The standard Apache-2\.0 terms follow\.\n\nApache terms/);
  assert.match(byName.zod.text, /^Bundled in the on-device agent bundle and workflow worker\./);
  assert.match(byName.effect.text, /^Bundled in the on-device workflow worker\./);
  assert.equal(byName['@scope/pkg'].license, 'ISC');
  assert.equal(byName.hoisted.license, 'Apache-2.0');
  assert.equal(entries.filter(entry => entry.name === 'zod').length, 1, 'deduplicated across bundles');
  for (const entry of entries.filter(item => item !== node)) assert.equal(entry.source, `https://www.npmjs.com/package/${entry.name}/v/${entry.version}`);
  // The source defaults to the pinned checkout; ALPHA_LOCAL_AGENT_SOURCE_DIR names another prepared one.
  const previousSource = process.env.ALPHA_LOCAL_AGENT_SOURCE_DIR;
  try {
    delete process.env.ALPHA_LOCAL_AGENT_SOURCE_DIR;
    assert.equal(runtimeEntries(root, templates, [], { agentDir: agent }).length, entries.length, 'default source is vendor/eliza');
    const overridden = path.join(root, 'artifacts', 'custom-prepared-source');
    fs.cpSync(source, overridden, { recursive: true });
    fs.rmSync(path.join(source, 'packages/hoisted'), { recursive: true });
    process.env.ALPHA_LOCAL_AGENT_SOURCE_DIR = overridden;
    const errors2 = [];
    assert.equal(runtimeEntries(root, templates, errors2, { agentDir: agent }).length, entries.length, 'explicit source override');
    assert.deepEqual(errors2, []);
  } finally {
    if (previousSource === undefined) delete process.env.ALPHA_LOCAL_AGENT_SOURCE_DIR;
    else process.env.ALPHA_LOCAL_AGENT_SOURCE_DIR = previousSource;
  }
});

test('a recorded written source offer ships in the Node.js notice; a malformed record fails generation', t => {
  const { root, agent, source } = stagedRuntime(t);
  const offerFile = path.join(root, 'licenses/source-offer.json');
  write(offerFile, JSON.stringify({ offer: 'Example written offer text.' }));
  const errors = [];
  const node = runtimeEntries(root, templates, errors, { agentDir: agent, sourceDir: source }).find(entry => entry.name === RUNTIME_ENTRY);
  assert.deepEqual(errors, []);
  assert.match(node.text, /listed in its LICENSE file at that tag\.\n\nExample written offer text\.$/);
  write(offerFile, JSON.stringify({ offer: ' ' }));
  const malformed = [];
  runtimeEntries(root, templates, malformed, { agentDir: agent, sourceDir: source });
  assert.match(malformed.join('\n'), /licenses\/source-offer\.json has no "offer" text/);
});

test('copyleft, unknown, undeclared and text-less runtime packages are listed and flagged, never an error', t => {
  const { root, agent, source, bundled, recordBundle, pkg } = stagedRuntime(t);
  const real = loadTemplates(ROOT);
  const added = [];
  const add = (name, manifest, files = {}) => {
    pkg(path.join(source, stored(name, '1.0.0')), { name, version: '1.0.0', ...manifest }, files);
    added.push({ name, version: '1.0.0' });
  };
  add('gpl-binary', { license: 'GPL-3.0-or-later', repository: 'github:example/gpl-binary' }, { LICENSE: real.canonical('GPL-3.0-or-later') });
  add('agpl-lib', { license: 'AGPL-3.0-or-later' }, { 'LICENSE.md': real.canonical('AGPL-3.0-or-later') });
  add('lgpl-lib', { license: 'LGPL-3.0-only' }, { LICENSE: 'lgpl-lib is licensed under the terms of the LGPLv3 license. See the website for the text.' });
  add('blue-oak', { license: 'BlueOak-1.0.0' }, { 'LICENSE.md': '# Blue Oak Model License\n\nVersion 1.0.0' });
  add('source-available', {}, { LICENSE: 'Copyright Example Inc. All rights reserved.\n\nYou may use the Program solely for Non-Commercial Use.' });
  add('undeclared-mit', {}, { 'LICENSE.md': real.mit });
  add('no-file-bsd', { license: 'BSD-3-Clause' });
  add('nothing-at-all', {});
  add('custom-id', { license: 'Example-Custom-1.0' }, { LICENSE: 'Example custom terms.' });
  recordBundle([...bundled, ...added]);
  pkg(path.join(source, stored('@worker/undeclared', '0.35.0')), { name: '@worker/undeclared', version: '0.35.0' }, { LICENSE: real.mit });
  write(path.join(agent, 'workflow-worker/dependencies.json'), JSON.stringify({ '@worker/undeclared': '0.35.0' }));
  const errors = [];
  const entries = runtimeEntries(root, real, errors, { agentDir: agent, sourceDir: source }).map(finishEntry);
  assert.deepEqual(errors, []);
  const by = Object.fromEntries(entries.map(entry => [entry.name, entry]));
  const facts = name => [by[name].license, by[name].flags, by[name].textSource];
  assert.deepEqual(facts('gpl-binary'), ['GPL-3.0-or-later', ['copyleft-strong'], undefined]);
  assert.match(by['gpl-binary'].obligations[0].note, /Corresponding source: https:\/\/www\.npmjs\.com\/package\/gpl-binary\/v\/1\.0\.0 \(repository: https:\/\/github\.com\/example\/gpl-binary\)/);
  assert.match(by['gpl-binary'].text, /GNU GENERAL PUBLIC LICENSE/);
  assert.deepEqual(facts('agpl-lib'), ['AGPL-3.0-or-later', ['copyleft-strong', 'network-copyleft'], undefined]);
  // The licence file only names the LGPL: the canonical LGPL and GPL texts are added so the text itself ships.
  assert.deepEqual(facts('lgpl-lib'), ['LGPL-3.0-only', ['copyleft-weak', 'licence-text-missing-from-package'], 'package-and-spdx-canonical']);
  assert.match(by['lgpl-lib'].text, /licensed under the terms of the LGPLv3[\s\S]*GNU LESSER GENERAL PUBLIC LICENSE\s+Version 3[\s\S]*GNU GENERAL PUBLIC LICENSE\s+Version 3/);
  assert.deepEqual(facts('blue-oak'), ['BlueOak-1.0.0', ['permissive-not-previously-listed'], undefined]);
  // Not open source: said so, never passed off as an open licence.
  assert.deepEqual(facts('source-available'), [UNKNOWN, ['unknown-licence', 'non-open-source-terms'], undefined]);
  assert.match(by['source-available'].obligations[1].note, /limits use to non-commercial use\. These are not open-source terms, so the open-source licence policy does not cover this item/);
  assert.match(by['source-available'].text, /solely for Non-Commercial Use/);
  assert.deepEqual(facts('undeclared-mit'), ['MIT', ['unverified'], undefined]);
  assert.match(by['undeclared-mit'].obligations[0].note, /manifest declares no licence\. MIT was identified from the text of the package's own licence file/);
  assert.deepEqual(facts('no-file-bsd'), ['BSD-3-Clause', ['licence-text-missing-from-package'], 'spdx-canonical']);
  assert.match(by['no-file-bsd'].text, /Neither the name of the copyright holder/);
  assert.deepEqual(facts('nothing-at-all'), [UNKNOWN, ['unknown-licence', 'licence-text-missing-from-package'], undefined]);
  assert.deepEqual(facts('custom-id'), ['Example-Custom-1.0', ['unknown-licence'], undefined]);
  assert.deepEqual(facts('@worker/undeclared'), ['MIT', ['unverified'], undefined]);
  for (const entry of entries) assert.ok(entry.text.trim() && entry.source.includes(entry.name === RUNTIME_ENTRY ? 'nodejs/node' : `/package/${entry.name}/v/${entry.version}`), entry.name);
  const lines = licenceFlagLines(entries);
  assert.ok(lines.includes('LICENCE FLAG copyleft-strong: gpl-binary@1.0.0 (GPL-3.0-or-later)'));
  assert.ok(lines.includes('LICENCE FLAG network-copyleft: agpl-lib@1.0.0 (AGPL-3.0-or-later)'));
  assert.ok(lines.includes('LICENCE FLAG unknown-licence: nothing-at-all@1.0.0 (UNKNOWN)'));
});

test('broken input still fails: a corrupted or nameless package manifest is an error, not a flag', t => {
  const { root, agent, source } = stagedRuntime(t);
  const manifest = path.join(source, stored('zod', '4.1.0'), 'package.json');
  for (const broken of ['{"name": "zod", ', JSON.stringify({ license: 'MIT' })]) {
    fs.writeFileSync(manifest, broken);
    const errors = [];
    runtimeEntries(root, templates, errors, { agentDir: agent, sourceDir: source });
    // A package whose manifest does not name it is not the package the bundle recorded.
    assert.deepEqual(errors, [
      'agent bundle: zod@4.1.0 is not installed in this workspace; run pnpm install',
      'workflow-worker zod@4.1.0 is not installed in this workspace; run pnpm install',
    ]);
  }
});

test('a missing prepared package, bundle manifest or worker inventory fails generation', t => {
  const { root, agent, source, recordBundle } = stagedRuntime(t);
  fs.rmSync(path.join(source, 'packages/hoisted'), { recursive: true });
  fs.rmSync(path.join(agent, 'workflow-worker/dependencies.json'));
  let errors = [];
  runtimeEntries(root, templates, errors, { agentDir: agent, sourceDir: source });
  assert.ok(errors.includes('agent bundle: hoisted@0.1.0 is not installed in this workspace; run pnpm install'), errors.join('\n'));
  assert.ok(errors.some(error => /workflow-worker\/dependencies\.json is missing from the staged runtime/.test(error)), errors.join('\n'));
  recordBundle([]);
  errors = [];
  runtimeEntries(root, templates, errors, { agentDir: agent, sourceDir: source });
  assert.ok(errors.some(error => /manifest\.json lists no bundled package/.test(error)), errors.join('\n'));
  fs.rmSync(path.join(agent, 'alpha-source.json'));
  errors = [];
  assert.deepEqual(runtimeEntries(root, templates, errors, { agentDir: agent }).map(entry => entry.name), [RUNTIME_ENTRY]);
  assert.match(errors.join('\n'), /alpha-source\.json is missing or unreadable/);
});

test('without a staged runtime only the umbrella payload entry is shipped', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-no-runtime-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.equal(packagedRuntimePresent(root), false);
  assert.deepEqual(runtimeEntries(root, templates, []), []);
});

test('runtime enumeration follows explicit modes independently of current checkout notices', () => {
  const isNode = entry => entry.name === RUNTIME_ENTRY;
  // Baseline and packaged enumeration are both valid; this checkout may currently
  // carry either form after a real APK build. The isolated mode fixture above tests detection.
  const committed = collectNotices(ROOT, { packagedRuntime: false });
  assert.equal(committed.entries.some(isNode), false);
  assert.ok(committed.entries.some(entry => entry.name === 'On-device elizaOS agent runtime payload'));
  // Settings shows these entries to the phone owner: no release to-dos or build commands.
  for (const entry of committed.entries) assert.doesNotMatch(entry.text, /distributor must|(?:bun|pnpm) run /, entry.name);
  const packaged = collectNotices(ROOT, { packagedRuntime: true });
  if (packagedRuntimePresent(ROOT)) assert.ok(packaged.entries.some(isNode));
  else assert.ok(packaged.errors.some(error => /--packaged-runtime needs a staged runtime/.test(error)), 'refuses without a staged runtime');
});

test('compiled Google host enumerates its actual scoped package inputs and deduplicates shared packages', t => {
  const { root, agent, source } = stagedRuntime(t);
  const packageRoot = stored('@noble/curves', '2.2.0');
  write(path.join(root, packageRoot, 'package.json'), JSON.stringify({ name: '@noble/curves', version: '2.2.0', license: 'MIT' }));
  write(path.join(root, packageRoot, 'LICENSE'), 'actual curves notice');
  const shared = path.relative(root, path.join(source, stored('zod', '4.1.0')));
  write(path.join(agent, 'workflow-worker/manifest.json'), JSON.stringify({ nativeGoogleHost: { inputs: {
    [packageRoot + '/esm/curve.js']: 'a'.repeat(64), [packageRoot + '/esm/utils.js']: 'b'.repeat(64), [shared + '/index.js']: 'c'.repeat(64), 'apps/app/src/host.ts': 'd'.repeat(64),
  } } }));
  const errors = [];
  const entries = runtimeEntries(root, templates, errors, { agentDir: agent, sourceDir: source });
  assert.deepEqual(errors, []);
  const curves = entries.filter(entry => entry.name === '@noble/curves');
  assert.equal(curves.length, 1);
  assert.equal(curves[0].version, '2.2.0');
  assert.match(curves[0].text, /actual curves notice/);
  assert.match(curves[0].text, /native Google host/);
  assert.equal(entries.filter(entry => entry.name === 'zod').length, 1);
  assert.match(entries.find(entry => entry.name === 'zod').text, /agent bundle and workflow worker and native Google host/);
  fs.unlinkSync(path.join(root, packageRoot, 'package.json'));
  const missing = [];
  runtimeEntries(root, templates, missing, { agentDir: agent, sourceDir: source });
  assert.ok(missing.some(error => error.includes('native Google host') && error.includes('not in the prepared runtime')));
});
