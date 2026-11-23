// Alpha's copies of shared classes that present UI but must keep their shared names
// (android/shared-ui-overrides.json): the reminder store, which posts the due-reminder notification
// and is reached package-privately by the shared reminder engine, and the Autofill provider, whose
// installed component name Android keeps for the selected provider. android/app/product.gradle
// compiles each copy in place of the shared file inside the shared module. Below its class
// declaration each copy must stay the pinned upstream source apart from the changes Alpha lists
// here, so storage, scheduling, identifiers and security checks remain the ones upstream's own tests
// cover. When the pin moves and upstream changed one of these files, this fails: port the change
// into Alpha's copy, then rerun. The ported upstream tests stay the pinned tests too. Source reading
// only: no Android or credential is used.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const {schema, overrides} = JSON.parse(read('android/shared-ui-overrides.json'));
// Each upstream os module the host builds as :eliza-<module> (android/consumer-host.json osModules).
const modules = new Map(JSON.parse(read('android/consumer-host.json')).profile.osModules.map(({module}) => [`eliza-${module}`, {path: `packages/os/android/${module}`}]));
/** Alpha's changes to each upstream body, applied in order as [upstream text, Alpha text]. None yet. */
const ALPHA_CHANGES = {
  'ai.eliza.plugins.reminders.ReminderStore': [],
  'ai.eliza.plugins.passwords.ElizaPasswordAutofillService': [],
};
/** Upstream tests ported to android/app/src/test unchanged below their package line. */
const PORTED_TESTS = {
  'ai.eliza.plugins.reminders.ReminderStore': ['ReminderQuestionTest', 'ReminderStoreRetentionTest'],
  'ai.eliza.plugins.passwords.ElizaPasswordAutofillService': [],
};

const paths = override => {
  const relative = override.class.replaceAll('.', '/') + '.java';
  const module = modules.get(override.module);
  return {upstream: `vendor/eliza/${module.path}/src/main/java/${relative}`, copy: `${override.source}/${relative}`};
};
const declaration = (source, simple) => {
  const match = new RegExp(`^(?:public |final |abstract )*class ${simple}\\b[^\\n]*\\{$`, 'm').exec(source);
  assert.ok(match, `${simple} declaration`);
  return {header: source.slice(0, match.index), body: source.slice(match.index)};
};
const imports = header => [...header.matchAll(/^import ([\w.*]+);$/gm)].map(match => match[1]).sort();

test('each copy is listed once, for a shared module the app compiles, under its own root', () => {
  assert.equal(schema, 1);
  assert.deepEqual(overrides.map(override => override.class).sort(), Object.keys(ALPHA_CHANGES).sort());
  for (const override of overrides) {
    const module = modules.get(override.module);
    assert.ok(module, `${override.module} is an os module the app builds`);
    assert.match(override.source, /^android\/shared-ui\/[a-z-]+\/java$/);
    const {upstream, copy} = paths(override);
    assert.ok(fs.existsSync(upstream) && fs.existsSync(copy), `${override.class}: upstream and copy exist`);
    assert.deepEqual(fs.readdirSync(override.source, {recursive: true}).filter(name => name.endsWith('.java')),
      overrides.filter(other => other.source === override.source).map(other => other.class.replaceAll('.', '/') + '.java'), 'a copy root holds only listed copies');
    assert.ok(override.reason.length > 30, `${override.class} has a reason`);
  }
});

test('below its declaration each copy is the pinned upstream source with only Alpha\'s listed changes', () => {
  for (const override of overrides) {
    const simple = override.class.split('.').pop(), {upstream: upstreamFile, copy: copyFile} = paths(override);
    const upstream = declaration(read(upstreamFile), simple), copy = declaration(read(copyFile), simple);
    let expected = upstream.body;
    for (const [from, to] of ALPHA_CHANGES[override.class]) { assert.ok(expected.includes(from), `upstream still contains ${from}`); expected = expected.replaceAll(from, to); }
    const want = expected.split('\n'), have = copy.body.split('\n');
    const first = want.findIndex((line, index) => line !== have[index]);
    assert.equal(first === -1 && want.length === have.length ? -1 : first, -1,
      `${copyFile} differs from the pinned ${simple} at body line ${first + 1}:\n upstream: ${want[first]}\n alpha:    ${have[first]}`);
    assert.equal(/^package [\w.]+;$/m.exec(copy.header)?.[0], /^package [\w.]+;$/m.exec(upstream.header)?.[0], 'same package');
    assert.deepEqual(imports(copy.header), imports(upstream.header), 'same imports');
    assert.match(copy.header, /Alpha's copy of the shared/);
  }
});

test('the ported upstream tests stay the pinned tests', () => {
  for (const override of overrides) for (const name of PORTED_TESTS[override.class]) {
    const pkg = override.class.split('.').slice(0, -1).join('/');
    const upstream = read(`vendor/eliza/${modules.get(override.module).path}/src/test/java/${pkg}/${name}.java`);
    const ported = read(`android/app/src/test/java/${pkg}/${name}.java`);
    const body = text => text.slice(text.indexOf('\nimport '));
    assert.equal(body(ported), body(upstream), `${name} is the pinned upstream test`);
    assert.match(ported, /Ported unchanged from/);
  }
});

test('the app build compiles each copy in place of the shared file', () => {
  const gradle = read('android/app/product.gradle');
  assert.match(gradle, /new groovy\.json\.JsonSlurper\(\)\.parse\(file\('\.\.\/shared-ui-overrides\.json'\)\)/);
  assert.match(gradle, /module\.pluginManager\.withPlugin\('com\.android\.library'\) \{/);
  assert.match(gradle, /module\.android\.sourceSets\.main\.java\.srcDir\(overrideRoot\)/);
  assert.match(gradle, /module\.android\.sourceSets\.main\.java\.filter\.exclude \{ element -> element\.file\.canonicalFile == replaced \}/);
  assert.match(gradle, /if \(module\.state\.executed\) throw new GradleException/);
});
