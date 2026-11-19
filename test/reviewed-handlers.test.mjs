// PROD-09 stage 1: in a product build the native adapter keeps a reference view's handler only when
// a replacement rule covers it or it is on the reviewed list (native-adapter.ts REVIEWED_HANDLERS);
// any other handler is treated as unavailable, so its control is not shown. The reviewed list names
// exactly the handlers template.html binds for those views, so a new control is reviewed here first.
import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const MARK = Symbol.for('alpha.unavailableControl');
const root = resolve(import.meta.dirname, '..');
mkdirSync(join(root, 'test-results'), {recursive: true});
const dir = mkdtempSync(join(root, 'test-results/reviewed-handlers-'));
after(() => rmSync(dir, {recursive: true, force: true}));
const stubbed = stubs => ({name: 'stubs', setup(b) {
  b.onResolve({filter: /.*/}, a => a.path in stubs ? {path: a.path, namespace: 'stub'} : undefined);
  b.onLoad({filter: /.*/, namespace: 'stub'}, a => ({contents: stubs[a.path], loader: 'js'}));
}});
let bundles = 0;
const adapter = async devProfile => {
  const output = await build({entryPoints: [join(root, 'apps/app/src/prototype/native-adapter.ts')], bundle: true, format: 'esm', platform: 'node', write: false, plugins: [stubbed({
    '../runtime/cloud-protocol': 'export const cloudServiceName=()=>"Cloud";',
    '../browser/dev-profile': `export const browserDevProfile=${devProfile};`,
    '../build-flags': 'export const testMocksEnabled=false;',
    '../runtime/voice-selection': 'export const speechRoute=()=>"device";',
    '@capacitor/core': 'export const Capacitor={isNativePlatform:()=>true};',
    '../daily': 'export const DailyApps={perform:async()=>({status:"opened"}),addListener:async()=>null};',
    '../runtime/connection-ui': 'export const connectionController={getSnapshot:()=>({session:null,actionHistory:[]})};export const agentAvailabilityNotice=()=>"";export const agentPendingText=(_c,t)=>t;',
    './camera-adapter': 'export const askAboutCapture=()=>false;',
    '@elizaos/capacitor-system/settings': 'export const broaderPageNotice=0,handoffGate=0,switchValue=0,SYSTEM_TILE_SETTINGS_PAGES={},tileAccessibleName=0,tileFactsFromSystemFacts=0,tileStateText=0;',
    './context-selection': 'export const captureQuestion=()=>undefined,locationMimeTypes=()=>undefined;',
  })]});
  const file = join(dir, `bundle-${bundles++}.mjs`);
  writeFileSync(file, output.outputFiles[0].text);
  return import(pathToFileURL(file).href);
};
const product = await adapter(false), development = await adapter(true);
const MODULES = ['phone', 'messages', 'inbox', 'browser', 'camera', 'photos', 'maps', 'calendar', 'contacts', 'files', 'settings', 'wallet', 'workflows'];

/** Handler keys template.html binds (on* events and refs) under each reference view, through sc-for aliases. */
function templateHandlers() {
  const source = readFileSync(join(root, 'apps/app/src/prototype/template.html'), 'utf8');
  const stack = [], found = Object.fromEntries(MODULES.map(module => [module, new Set()]));
  const resolvePath = path => {
    const [head, ...rest] = path.split('.');
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i].as === head) return [resolvePath(stack[i].list), '[]', ...rest].join('.');
    return path;
  };
  for (const [, close, name, attrs] of source.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*)>/g)) {
    if (name === 'sc-for') {
      if (close) { stack.pop(); continue; }
      stack.push({as: /\bas="([^"]+)"/.exec(attrs)?.[1] || 'item', list: /\blist="\{\{\s*([^}]+?)\s*\}\}"/.exec(attrs)?.[1] || ''});
    }
    for (const [, path] of attrs.matchAll(/\b(?:on[A-Z][A-Za-z]*|ref)="\{\{\s*([^}]+?)\s*\}\}"/g)) {
      const parts = resolvePath(path).split('.'), key = parts.at(-1);
      if (key !== '[]' && found[parts[0]]) found[parts[0]].add(key);
    }
  }
  return found;
}

test('the reviewed list names exactly the handlers template.html binds for each reference view', () => {
  const bound = templateHandlers();
  for (const module of MODULES) {
    const listed = product.reviewedHandlerKeys(module);
    const missing = [...bound[module]].filter(key => !listed.has(key)).sort();
    const stale = [...listed].filter(key => !bound[module].has(key)).sort();
    assert.deepEqual(missing, [], `${module}: review these new controls, then list them in REVIEWED_HANDLERS (local navigation or state) or replace them in replacement()`);
    assert.deepEqual(stale, [], `${module}: these listed handlers are no longer bound in template.html; remove them`);
  }
  // The template binds a few hundred; an empty derivation would pass the check above.
  assert.ok(MODULES.reduce((sum, module) => sum + bound[module].size, 0) > 400);
});

test('a product build hides a handler nobody reviewed; the development profile keeps it', () => {
  const noop = () => {}, calls = [];
  const simulateTransfer = (...args) => { calls.push(args); return 'done'; };
  const tree = () => ({sheet: {simulateTransfer, close: noop}, rows: [{open: noop}]});
  const views = {wallet: {render: tree}, notes: {render: tree}};
  product.installPrototypeNativeAdapters(null, views);
  const toasts = [], api = {toast: message => toasts.push(message), get: () => ({}), set() {}};
  const out = views.wallet.render({}, api);
  // Marked, so dc-lite.js shows no control for it (test/unavailable-controls.test.mjs).
  assert.equal(out.sheet.simulateTransfer[MARK], true);
  assert.equal(out.sheet.close, noop);
  assert.equal(out.rows[0].open, noop);
  // Reviewed code that reads it (a list filter's apply/current) still reaches the original.
  assert.equal(out.sheet.simulateTransfer(1, 2), 'done');
  assert.deepEqual(calls, [[1, 2]]);
  assert.deepEqual(toasts, []);
  // This phone's own views are not reference views: nothing of theirs is walked.
  assert.equal(views.notes.render({}, api).sheet.simulateTransfer, simulateTransfer);

  const dev = {wallet: {render: tree}};
  development.installPrototypeNativeAdapters(null, dev);
  assert.equal(dev.wallet.render({}, api).sheet.simulateTransfer, simulateTransfer);
});

test('a React element in a view is rendered as given', () => {
  const element = {$$typeof: Symbol.for('react.transitional.element'), type: () => null, props: {onClick: () => {}}};
  const views = {files: {render: () => ({banner: element})}};
  product.installPrototypeNativeAdapters(null, views);
  assert.equal(views.files.render({}, {toast() {}, get: () => ({}), set() {}}).banner, element);
});
