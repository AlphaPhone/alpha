import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import vm from 'node:vm';
import {repositoryRoot} from '../scripts/quint-lib.ts';
import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';
import {stripTypeScriptTypes} from './support/strip-types.mjs';

// Source-bound check of specs/quint/application/SettingsNavigation.qnt: the model's tables match
// settings-adapter.ts, and every step of every model run, replayed through the adapter's own Back,
// section allowlist and page resolution, lands where the model says. It does not mount Settings;
// test/browser/settings-navigation-refinement.spec.ts drives the installed adapter.
const read = path => readFileSync(join(repositoryRoot, path), 'utf8');
const source = read('apps/app/src/prototype/settings-adapter.ts');
const model = read('specs/quint/application/SettingsNavigation.qnt');
const reference = read('apps/app/src/prototype/model.js');

const between = (text, start, end) => {
  const from = text.indexOf(start);
  assert.ok(from >= 0, `missing ${start}`);
  const to = text.indexOf(end, from + start.length);
  assert.ok(to > from, `missing end of ${start}`);
  return text.slice(from, to + end.length);
};

const facts = between(source, '// settings-facts:begin', '// settings-facts:end');
const objectLiteral = start => between(source, start, '};').slice(start.length).trim().replace(/;$/, '');
const back = between(source, 'definition.back = (state:Bag,api:Bag) => {', '\n  };');
const categoryPage = between(source, 'const categoryPage=', ';');
assert.match(reference, /if \(st\.page\) \{ api\.set\(\{ page: null,/, 'the reference Settings Back clears the page');
assert.match(source, /liveSettingsPage\(state\.page, developerTools\)/, 'render resolves pages through liveSettingsPage');

const context = vm.createContext({});
vm.runInContext(stripTypeScriptTypes(`${facts.replace(/^export /gm, '')}
type Bag = any;
const PASSWORD_PAGES = ['password-provider', 'password-entry'];
const leavePasswordEntry = () => {}, leavePasswordManager = () => {};
// The reference Back (model.js): a page clears to none, otherwise Settings leaves.
const settingsBack = (st: Bag, api: Bag) => { if (st.page) { api.set({page: null}); return true; } return false; };
const categoryNames: Record<string,string> = ${objectLiteral('const categoryNames:Record<string,string>=')};
const settingsParents: Record<string,string> = ${objectLiteral('const settingsParents: Record<string,string> =')};
const definition: Bag = {};
${back};
function resolve(state: Bag) {
  const activeSettingsCategory=typeof state.settingsCategory==='string'&&Object.hasOwn(categoryNames,state.settingsCategory)?state.settingsCategory:null;
  ${categoryPage}
  return categoryPage || (state.page ? liveSettingsPage(state.page, false) : null) || 'root';
}
globalThis.adapter = {settingsSectionPatch, settingsPage, liveSettingsPage, RETIRED_SETTINGS_PAGES, categoryNames, settingsParents, back: definition.back, resolve};`), context);
const adapter = context.adapter;

// Quint string literals: "a" -> "b" pairs in a Map, or members of a Set.
const quintMap = name => Object.fromEntries([...between(model, `pure val ${name} = Map(`, ')').matchAll(/"([^"]*)" -> "([^"]*)"/g)].map(m => [m[1], m[2]]));
const quintSet = name => [...between(model, `pure val ${name} = Set(`, ')').matchAll(/"([^"]*)"/g)].map(m => m[1]).sort();

test('SettingsNavigation tables match the Settings adapter', () => {
  assert.deepEqual(quintSet('CATEGORY_KEYS'), Object.keys(adapter.categoryNames).sort());
  assert.deepEqual(quintMap('PARENTS'), {...adapter.settingsParents});
  for (const [section, category] of Object.entries(quintMap('SECTIONS')))
    assert.deepEqual({...adapter.settingsSectionPatch(section)}, {page: section, settingsCategory: category || null}, section);
  for (const refused of ['developer', 'character', 'password-provider', 'password-entry', 'agent-recovery-details', 'problems', 'wifi', 'battery', 'accounts', 'constructor', '__proto__'])
    assert.equal(adapter.settingsSectionPatch(refused), null, refused);
  for (const page of quintSet('DEVELOPER_PAGES')) assert.equal(adapter.settingsPage(page, false), null, page);
  assert.deepEqual(quintSet('RETIRED_PAGES'), [...adapter.RETIRED_SETTINGS_PAGES].sort());
  // A retired page draws nothing in any build; every other page resolves as settingsPage does.
  for (const page of quintSet('RETIRED_PAGES')) for (const developer of [false, true]) assert.equal(adapter.liveSettingsPage(page, developer), null, page);
  for (const page of ['display', 'about', 'models', 'connections', 'sound', null]) assert.equal(adapter.liveSettingsPage(page, false), page, String(page));
  for (const page of quintSet('DEVELOPER_PAGES')) assert.equal(adapter.liveSettingsPage(page, true), page, page);
});

function modelTrace(scenario) {
  const directory = mkdtempSync(join(tmpdir(), 'alpha-settings-navigation-'));
  try {
    const result = spawnSync(process.execPath, [join(repositoryRoot, 'node_modules/@informalsystems/quint/dist/src/cli.js'),
      'test', 'specs/quint/application/SettingsNavigation.qnt', '--main=SettingsNavigation', '--backend=typescript',
      '--seed=20261119', '--max-samples=1', `--match=^${scenario}$`, `--out-itf=${join(directory, 'trace-{test}-{seq}.json')}`],
    {cwd: repositoryRoot, encoding: 'utf8', timeout: scaledTimeout(30000)});
    assert.ifError(result.error);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    return JSON.parse(readFileSync(join(directory, `trace-${scenario}-0.json`), 'utf8')).states.map(state => state.s);
  } finally { rmSync(directory, {recursive: true, force: true}); }
}

const view = s => ({page: s.page || null, settingsCategory: s.category || null});
const runs = ['categoryBackTest', 'aboutNestedBackTest', 'privacyPermissionsBackTest', 'passwordBackTest', 'sectionOpensInCategoryTest', 'sectionRefusedTest',
  'passwordLockTest', 'sectionLocksVaultTest', 'retiredPageTest'];

for (const run of runs) test(`SettingsNavigation ${run} replays through the adapter`, {timeout: scaledTimeout(60000)}, () => {
  const states = modelTrace(run);
  assert.ok(states.length > 1);
  states.forEach((s, index) => {
    if (s.open) assert.equal(adapter.resolve(view(s)), s.shown, `${run} step ${index}: shown page`);
    if (index === 0) return;
    const before = states[index - 1];
    if (s.via === 'back') {
      let patch = null;
      const handled = adapter.back(view(before), {set: next => { patch = next; }});
      if (!s.open) { assert.equal(handled, false, `${run} step ${index}: Back leaves Settings`); return; }
      assert.equal(handled, true);
      assert.deepEqual(view(s), {...view(before), ...patch}, `${run} step ${index}: Back`);
    } else if (s.via === 'section') {
      assert.deepEqual(view(s), {...adapter.settingsSectionPatch(s.page)}, `${run} step ${index}: section`);
    } else if (s.via === 'refused' || s.via === 'unlock') {
      assert.deepEqual(view(s), view(before), `${run} step ${index}: ${s.via} keeps the page`);
    } else if (s.via === 'restored') {
      // A development jump resets the view, then selects the page.
      assert.deepEqual(view(s), {page: s.page, settingsCategory: null}, `${run} step ${index}: restored page`);
    }
  });
});
