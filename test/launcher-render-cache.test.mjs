import {test} from 'node:test';
import assert from 'node:assert/strict';
const {createLauncher, createLauncherListCache, filterLauncherApps, describeLauncherApps, installHomeLauncher} = await import('../apps/app/src/prototype/home-launcher.ts');

const apps = [
  {packageName: 'com.android.settings', label: 'Settings'},
  {packageName: 'org.example.camera', label: 'Caméra'},
  {packageName: 'com.android.chrome', label: 'Chrome'},
];

test('one inventory is described and searched once per app list and query', () => {
  const cache = createLauncherListCache();
  const details = cache.details(apps), all = cache.matching(apps, '');
  assert.deepEqual([...details], [...describeLauncherApps(apps)]);
  assert.deepEqual(all, filterLauncherApps(apps, ''));
  assert.equal(cache.details(apps), details);
  assert.equal(cache.matching(apps, ''), all);
  const searched = cache.matching(apps, 'set');
  assert.deepEqual(searched.map(app => app.label), ['Settings']);
  assert.equal(cache.matching(apps, 'set'), searched);
  const next = [...apps];
  assert.notEqual(cache.details(next), details);
  assert.notEqual(cache.matching(next, 'set'), searched);
  assert.deepEqual(cache.matching(next, 'set'), searched);
});

test('unchanged product apps keep the same inventory list; a changed set replaces it', async () => {
  const launcher = createLauncher({list: async () => ({apps}), launch: async () => {}}, () => {}, {favorites: {read: () => [], write() {}}});
  launcher.setBuiltins([{packageName: 'alpha:notes', label: 'Notes'}]);
  await launcher.load();
  const list = launcher.snapshot().apps;
  launcher.setBuiltins([{packageName: 'alpha:notes', label: 'Notes'}]);
  assert.equal(launcher.snapshot().apps, list);
  launcher.setBuiltins([{packageName: 'alpha:notes', label: 'Notebook'}]);
  assert.notEqual(launcher.snapshot().apps, list);
  assert.deepEqual(launcher.snapshot().apps.map(app => app.label), ['Notebook', 'Settings', 'Caméra', 'Chrome']);
  launcher.setBuiltins([]);
  assert.deepEqual(launcher.snapshot().apps.map(app => app.label), ['Settings', 'Caméra', 'Chrome']);
});

test('a closed drawer sorts nothing; an open one lists the inventory', async () => {
  let drawer = false, sorts = 0;
  class Shell {
    S() { return {drawer, drawerQ: ''}; }
    setState() {}
    renderVals() { return {isOn: true, isView: false, apps: [{key: 'notes', label: 'Notes', open() {}}]}; }
  }
  const launcher = installHomeLauncher(Shell, {list: async () => ({apps}), launch: async () => {}}, {favorites: {read: () => ['alpha:notes'], write() {}}});
  const shell = new Shell();
  shell.renderVals();
  await launcher.load();
  const sort = Array.prototype.sort;
  Array.prototype.sort = function (...args) { sorts++; return sort.apply(this, args); };
  try {
    let rendered = shell.renderVals();
    assert.equal(rendered.drawerOpen, false);
    assert.deepEqual(rendered.launcher.rows, []);
    assert.deepEqual(rendered.apps.map(app => app.label), ['Notes']);
    assert.equal(sorts, 0);
    drawer = true;
    rendered = shell.renderVals();
    assert.deepEqual(rendered.launcher.rows.map(app => app.label), ['Caméra', 'Chrome', 'Settings']);
    assert.equal(rendered.launcher.count, '4 apps');
    const once = sorts;
    assert.ok(once > 0);
    shell.renderVals();
    assert.equal(sorts, once);
  } finally { Array.prototype.sort = sort; }
});
