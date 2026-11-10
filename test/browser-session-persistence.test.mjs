import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import {build} from 'esbuild';
import {stripTypeScriptTypes} from './support/strip-types.mjs';

const load = async path => import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(readFileSync(path, 'utf8'))).toString('base64'));
const {browsingSnapshot, restoreBrowsing, committedPage, tabLimitReached, MAX_SAVED_TABS} = await load('apps/app/src/browser/browsing-session.ts');
const {createSessionSaver, saveRetryDelay, surfacePollIdle} = await load('apps/app/src/browser/browser-poll.ts');
const adapter = readFileSync('apps/app/src/prototype/browser-adapter.ts', 'utf8');
const settle = async () => { for (let i = 0; i < 5; i++) await new Promise(resolveTick => setImmediate(resolveTick)); };
const page = id => ({url: `https://example.test/${id}`, title: id});

test('a restore that finds the user already browsing keeps the open tabs and adds the saved ones', () => {
  const saved = {history: ['https://example.test/old'], tabs: [{id: 's1', url: 'https://example.test/s1', title: 'One'}, {id: 's2', url: 'https://example.test/s2', title: 'Two'}], cur: 's2'};
  const state = {tabs: [{id: 'b0', hist: ['newtab'], pos: 0}], visits: ['https://example.test/now'], cur: 'b0'};
  const next = restoreBrowsing(saved, state, false);
  assert.deepEqual(next.tabs.map(tab => tab.id), ['b0', 's1', 's2']);
  assert.equal(next.tabs[0], state.tabs[0], 'the open tab is untouched');
  assert.equal(next.cur, 'b0', 'the open tab stays selected');
  assert.deepEqual(next.restored.map(tab => tab.id), ['s1', 's2']);
  assert.deepEqual(next.visits, ['https://example.test/now', 'https://example.test/old']);
  // The first save after hydration still contains the saved tabs.
  const known = new Map([['b0', page('b0')], ...next.restored.map(tab => [tab.id, tab])]);
  assert.deepEqual(browsingSnapshot({tabs: next.tabs, visits: next.visits, cur: next.cur}, id => known.get(id)).tabs.map(tab => tab.id), ['b0', 's1', 's2']);
});

test('a late restore never exceeds the tab limit, repeats an open tab or changes a pristine restore', () => {
  const saved = {history: [], tabs: Array.from({length: MAX_SAVED_TABS}, (_, index) => ({id: 's' + index, url: 'https://example.test/' + index, title: ''})), cur: 's3'};
  const open = [{id: 'a'}, {id: 'p', priv: true}, {id: 's0'}];
  const late = restoreBrowsing(saved, {tabs: open, visits: [], cur: 'p'}, false);
  assert.equal(late.tabs.length, MAX_SAVED_TABS);
  assert.deepEqual(late.tabs.map(tab => tab.id), ['a', 'p', 's0', 's1', 's2', 's3', 's4', 's5']);
  assert.equal(late.cur, 'p');
  const full = restoreBrowsing(saved, {tabs: Array.from({length: MAX_SAVED_TABS}, (_, index) => ({id: 'o' + index})), visits: [], cur: 'o0'}, false);
  assert.equal(full.tabs, undefined);
  assert.deepEqual(full.restored, []);
  assert.deepEqual(restoreBrowsing({history: [], tabs: []}, {tabs: open, visits: [], cur: 'a'}, false).restored, []);
  const pristine = restoreBrowsing(saved, {tabs: [{id: 'b0'}], visits: [], cur: 'b0'}, true);
  assert.deepEqual(pristine.tabs.map(tab => tab.id), saved.tabs.map(tab => tab.id));
  assert.equal(pristine.cur, 's3');
});

test('the selected tab is always among the saved tabs', () => {
  const tabs = [...Array.from({length: MAX_SAVED_TABS + 2}, (_, index) => ({id: 't' + index})), {id: 'secret', priv: true}];
  const last = browsingSnapshot({tabs, visits: [], cur: 't9'}, page);
  assert.equal(last.tabs.length, MAX_SAVED_TABS);
  assert.equal(last.cur, 't9');
  assert.deepEqual(last.tabs.map(tab => tab.id), ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't9']);
  assert.deepEqual(browsingSnapshot({tabs, visits: [], cur: 't2'}, page).tabs.map(tab => tab.id), ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7']);
  const priv = browsingSnapshot({tabs, visits: [], cur: 'secret'}, page);
  assert.ok(!priv.tabs.some(tab => tab.id === 'secret'));
  assert.equal(priv.cur, '');
  // A tab without a saveable address does not take a place.
  assert.deepEqual(browsingSnapshot({tabs: [{id: 'x'}, {id: 'y'}], visits: [], cur: 'y'}, id => id === 'x' ? {url: 'about:blank'} : page(id)).tabs.map(tab => tab.id), ['y']);
});

test('tab limit and committed-page decisions', () => {
  assert.equal(tabLimitReached(MAX_SAVED_TABS - 1), false);
  assert.equal(tabLimitReached(MAX_SAVED_TABS), true);
  assert.equal(tabLimitReached(MAX_SAVED_TABS + 3), true);
  assert.equal(tabLimitReached(NaN), true);
  const url = 'https://example.test/';
  assert.equal(committedPage({url, committed: true, loading: false, error: ''}), true);
  assert.equal(committedPage({url, committed: false, loading: false, error: ''}), false, 'an address that did not commit');
  assert.equal(committedPage({url, committed: true, loading: true}), false);
  assert.equal(committedPage({url, committed: true, error: 'net::ERR_FAILED'}), false);
  assert.equal(committedPage({committed: true}), false);
  assert.equal(committedPage(null), false);
});

test('history and the saved address use the same committed-page test', () => {
  const handler = adapter.slice(adapter.indexOf("Browser.addListener('stateChanged'"), adapter.indexOf("Browser.addListener('tabOpened'"));
  assert.match(handler, /const committed = committedPage\(event\);/);
  assert.match(handler, /\(committed\?\{savedUrl:event\.url\}:\{\}\)/);
  assert.match(handler, /if\(committed && state\(\) && !isPrivate\(event\.id\) && !event\.private\)shell\.vset\('browser',\{visits:/);
  assert.doesNotMatch(handler, /if\(event\.url && !event\.loading && !event\.error/);
});

function saverHarness() {
  const h = {inputs: [1], enabled: true, time: 0, built: 0, writes: [], fail: false, value: {tabs: ['a']}};
  h.saver = createSessionSaver({
    inputs: () => h.inputs, enabled: () => h.enabled, now: () => h.time,
    snapshot: () => { h.built++; return h.value; },
    write: async snapshot => { h.writes.push(snapshot); if (h.fail) throw new Error('store'); },
  });
  return h;
}

test('an idle poll builds no snapshot', async () => {
  const h = saverHarness();
  h.saver.prime();
  const built = h.built;
  for (let tick = 0; tick < 50; tick++) h.saver.save();
  await settle();
  assert.equal(h.built, built);
  assert.equal(h.writes.length, 0);
  h.inputs = [2]; h.value = {tabs: ['a', 'b']};
  for (let tick = 0; tick < 50; tick++) h.saver.save();
  await settle();
  assert.equal(h.built, built + 1, 'one snapshot for one change');
  assert.deepEqual(h.writes, [{tabs: ['a', 'b']}]);
  h.inputs = [3];
  h.saver.save(); await settle();
  assert.equal(h.writes.length, 1, 'an unchanged snapshot is not written again');
});

test('nothing is built or written while saving is disabled, and the change is kept', async () => {
  const h = saverHarness();
  h.enabled = false;
  for (let tick = 0; tick < 20; tick++) h.saver.save();
  assert.equal(h.built, 0);
  h.enabled = true; h.saver.save(); await settle();
  assert.equal(h.writes.length, 1);
});

test('a rejected save backs off instead of repeating on every poll', async () => {
  const h = saverHarness();
  h.fail = true;
  h.saver.save(); await settle();
  assert.equal(h.writes.length, 1);
  for (let tick = 0; tick < 19; tick++) { h.time += 100; h.saver.save(); await settle(); }
  assert.equal(h.writes.length, 1, 'no retry inside the first 2 s');
  const built = h.built;
  h.saver.save();
  assert.equal(h.built, built, 'a waiting retry builds nothing');
  h.time = 2000; h.saver.save(); await settle();
  assert.equal(h.writes.length, 2);
  h.time = 5999; h.saver.save(); await settle();
  assert.equal(h.writes.length, 2, 'the second wait is 4 s');
  h.time = 6000; h.saver.save(); await settle();
  assert.equal(h.writes.length, 3);
  // A changed snapshot is written at once; success ends the backoff.
  h.inputs = [2]; h.value = {tabs: ['c']}; h.fail = false; h.time = 6100;
  h.saver.save(); await settle();
  assert.equal(h.writes.length, 4);
  h.time = 1e9; h.saver.save(); await settle();
  assert.equal(h.writes.length, 4, 'a stored snapshot is not retried');
});

test('retry delay doubles from 2 s to at most 60 s', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 500].map(saveRetryDelay), [2000, 4000, 8000, 16000, 32000, 60000, 60000, 60000]);
  for (const odd of [0, -3, NaN, undefined]) assert.equal(saveRetryDelay(odd), 2000);
});

test('the poll is idle only off the Browser view with the page already hidden', () => {
  assert.equal(surfacePollIdle('home', 'hidden', 'hidden'), true);
  assert.equal(surfacePollIdle(undefined, 'hidden', 'hidden'), true);
  assert.equal(surfacePollIdle('browser', 'hidden', 'hidden'), false);
  assert.equal(surfacePollIdle('home', '', 'hidden'), false, 'geometry must be resent first');
  assert.equal(surfacePollIdle('home', '{"id":"b1"}', 'hidden'), false);
});

test('the adapter poll returns before measuring when idle and saves through the saver', () => {
  const update = adapter.slice(adapter.indexOf('  const update = () => {'), adapter.indexOf('  const openBrowserView'));
  const idle = update.indexOf('if(surfacePollIdle(S?.view,lastGeometry,hiddenGeometry)){if(reading)stopReading();saveSession();return;}');
  assert.ok(idle > 0);
  assert.ok(idle < update.indexOf('document.querySelector'), 'before any DOM query');
  assert.match(adapter, /const hiddenGeometry=JSON\.stringify\(\{session,id:null\}\);/);
  assert.match(adapter, /const saveSession = \(\) => saver\.save\(\);/);
  assert.match(adapter, /inputs: \(\) => \{ const s = state\(\); return \[s\?\.tabs, s\?\.visits, s\?\.cur, savedPages\]; \}/);
  assert.doesNotMatch(adapter, /lastSaved/);
});

test('a native tab opened past the tab limit is closed again', () => {
  const handler = adapter.slice(adapter.indexOf("Browser.addListener('tabOpened'"), adapter.indexOf("Browser.addListener('tabClosed'"));
  const region = stripTypeScriptTypes(handler.slice(handler.indexOf('(event:Bag)=>{'), handler.lastIndexOf('}).then(') + 1));
  const run = count => {
    const state = {tabs: Array.from({length: count}, (_, index) => ({id: 't' + index})), cur: 't0'}, closed = [], toasts = [];
    const context = {disposed: false, session: 's', state: () => state, tabLimitReached, TAB_LIMIT_MESSAGE: 'limit', created: new Map(), documentRevisions: new Map(), refresh() {},
      Browser: {close: async input => { closed.push(input.id); }}, shell: {vset: (_view, patch) => Object.assign(state, patch), toast: message => toasts.push(message)}};
    vm.runInNewContext('(' + region + ')', context)({session: 's', id: 'popup'});
    return {state, closed, toasts, created: context.created};
  };
  const full = run(MAX_SAVED_TABS);
  assert.equal(full.state.tabs.length, MAX_SAVED_TABS);
  assert.deepEqual(full.closed, ['popup']);
  assert.deepEqual(full.toasts, ['limit']);
  assert.equal(full.created.has('popup'), false);
  const room = run(MAX_SAVED_TABS - 1);
  assert.equal(room.state.tabs.length, MAX_SAVED_TABS);
  assert.equal(room.state.cur, 'popup');
  assert.deepEqual(room.closed, []);
});

test('a question review that fails to open leaves the browser page shown', async () => {
  const region = stripTypeScriptTypes(adapter.slice(adapter.indexOf('  async function askPage()'), adapter.indexOf('  function hide()')));
  const reports = [];
  const context = {AbortController, reading: undefined, questionReview: false, lastGeometry: 'shown', disposed: false,
    stopReading() {}, readingUnsupported: async () => false, update: async () => {}, report: error => reports.push(error.message),
    state: () => ({cur: 't'}), metadata: new Map([['t', {url: 'https://example.test/', title: 'Example', committed: true}]]), documentRevisions: new Map([['t', 1]]),
    webSourceOf: source => source, sensitiveReadingText: () => false, browserReadingSource: async () => ({text: 'page text'}),
    Capacitor: {isNativePlatform: () => false}, connectionController: {getSnapshot: () => ({open: false})},
    document: {hidden: false, documentElement: {hasAttribute: () => false}},
    shell: {S: () => ({screen: 'home', view: 'browser'}), vset() {}, api: () => ({})},
    reviewContentQuestion() { throw new Error('dialog failed'); }};
  await vm.runInNewContext(region + ';askPage', context)();
  assert.deepEqual(reports, ['dialog failed']);
  assert.equal(context.questionReview, false, 'the surface is not left hidden');
  assert.equal(context.lastGeometry, '', 'geometry is resent');
  assert.equal(context.reading, undefined);
});

test('a question dialog that cannot open removes itself and its listeners', async () => {
  const {JSDOM} = createRequire(import.meta.url)('jsdom');
  const dom = new JSDOM('<div class="os"><button id="opener"></button></div>');
  const names = ['window', 'document', 'HTMLElement', 'getComputedStyle'], previous = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
  const directory = mkdtempSync(join(tmpdir(), 'content-question-'));
  try {
    for (const name of names) Object.defineProperty(globalThis, name, {configurable: true, writable: true, value: name === 'window' ? dom.window : dom.window[name]});
    globalThis.getComputedStyle = element => dom.window.getComputedStyle(element);
    const bundle = await build({entryPoints: [resolve('apps/app/src/browser/content-question.ts')], bundle: true, format: 'esm', platform: 'node', write: false,
      plugins: [{name: 'ports', setup(b) { b.onResolve({filter: /local-ocr$/}, args => ({path: args.path, namespace: 'fixture'})); b.onLoad({filter: /.*/, namespace: 'fixture'}, () => ({contents: 'export const recognizeLocalText=async()=>({text:""});'})); }}]});
    const file = join(directory, 'content-question.mjs');
    writeFileSync(file, bundle.outputFiles[0].text);
    const {reviewContentQuestion} = await import(pathToFileURL(file));
    dom.window.HTMLDialogElement.prototype.showModal = function () { throw new dom.window.DOMException('cannot open', 'InvalidStateError'); };
    const closed = [];
    const open = () => reviewContentQuestion({name: 'Example', text: 'page text', current: () => true, compose() {}, closed: dismissed => closed.push(dismissed)});
    assert.throws(open, /cannot open/);
    assert.deepEqual(closed, [false], 'the caller is told once that the review is gone');
    assert.equal(dom.window.document.querySelector('dialog'), null);
    const back = new dom.window.Event('alpha-back', {cancelable: true});
    dom.window.dispatchEvent(back);
    assert.equal(back.defaultPrevented, false, 'no Back handler is left behind');
    // A dialog that opens still stays open and owns Back until dismissed.
    dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
    const close = open();
    assert.ok(dom.window.document.querySelector('.os dialog'));
    const owned = new dom.window.Event('alpha-back', {cancelable: true});
    dom.window.dispatchEvent(owned);
    assert.equal(owned.defaultPrevented, true);
    close();
    assert.deepEqual(closed, [false, true]);
  } finally {
    names.forEach((name, index) => { if (previous[index]) Object.defineProperty(globalThis, name, previous[index]); else delete globalThis[name]; });
    rmSync(directory, {recursive: true, force: true});
  }
});
