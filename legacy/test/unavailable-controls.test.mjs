// A control whose only effect would be a toast saying the feature is unavailable is not shown.
// native-adapter marks such handlers; dc-lite drops any element bound to a marked handler.
import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const MARK = Symbol.for('alpha.unavailableControl');
const stubbed = stubs => ({name: 'stubs', setup(b) {
  b.onResolve({filter: /.*/}, a => a.path in stubs ? {path: a.path, namespace: 'stub'} : undefined);
  b.onLoad({filter: /.*/, namespace: 'stub'}, a => ({contents: stubs[a.path], loader: 'js'}));
}});
// Bundles live inside the repository so an external 'react' resolves to the same copy as this test.
const root = resolve(import.meta.dirname, '..');
mkdirSync(join(root, 'test-results'), {recursive: true});
const dir = mkdtempSync(join(root, 'test-results/unavailable-controls-'));
after(() => rmSync(dir, {recursive: true, force: true}));
let bundles = 0;
const load = async (entry, stubs, external = []) => {
  const output = await build({entryPoints: [join(root, entry)], bundle: true, format: 'esm', platform: 'node', write: false, external, plugins: [stubbed(stubs)]});
  const file = join(dir, `bundle-${bundles++}.mjs`);
  writeFileSync(file, output.outputFiles[0].text);
  return import(pathToFileURL(file).href);
};

const adapter = await load('apps/app/src/prototype/native-adapter.ts', {
  '../runtime/cloud-protocol': 'export const cloudServiceName=()=>"Cloud";',
  '../browser/dev-profile': 'export const browserDevProfile=false;',
  '../build-flags': 'export const testMocksEnabled=false;',
  '../runtime/voice-selection': 'export const speechRoute=()=>"device";',
  '@capacitor/core': 'export const Capacitor={isNativePlatform:()=>true};',
  '../daily': 'export const DailyApps={perform:async()=>({status:"opened"}),addListener:async()=>null};',
  '../runtime/connection-ui': 'export const connectionController={getSnapshot:()=>({session:null,actionHistory:[]})};export const agentAvailabilityNotice=()=>"";export const agentPendingText=(_c,t)=>t;',
  './camera-adapter': 'export const askAboutCapture=()=>false;',
  '@elizaos/capacitor-system/settings': 'export const broaderPageNotice=0,handoffGate=0,switchValue=0,SYSTEM_TILE_SETTINGS_PAGES={},tileAccessibleName=0,tileFactsFromSystemFacts=0,tileStateText=0;',
  './context-selection': 'export const captureQuestion=()=>undefined,locationMimeTypes=()=>undefined;',
});

test('the walker marks controls that could only say they are unavailable', () => {
  const noop = () => {};
  const trees = {
    camera: {ask: noop, shutter: noop},
    browser: {readAloud: noop, openNews: noop, bookNow: noop, toggleMenu: noop},
    photos: {send: noop, selShare: noop, fav: noop},
    maps: {web: noop, shareEta: noop},
    // Files' fixture Share sheet is gone; the selection's Share still only names the Files app.
    files: {selShare: noop, sort: noop},
    messages: {t: {ask: noop, who: noop}},
    inbox: {d: {ask: noop, forward: noop}},
    calendar: {open: {join: noop}},
  };
  const views = {...Object.fromEntries(Object.entries(trees).map(([name, tree]) => [name, {render: () => tree}])), settings: {render: () => ({})}};
  adapter.installPrototypeNativeAdapters(null, views);
  const toasts = [];
  const api = {toast: message => toasts.push(message), get: () => ({}), set() {}};
  const out = Object.fromEntries(Object.keys(trees).map(name => [name, views[name].render({}, api)]));
  const marked = [out.camera.ask, out.browser.readAloud, out.browser.openNews, out.browser.bookNow, out.photos.send, out.photos.selShare,
    out.maps.web, out.maps.shareEta, out.files.selShare, out.messages.t.ask, out.inbox.d.ask, out.calendar.open.join];
  for (const handler of marked) assert.equal(handler[MARK], true);
  // Real effects and local navigation stay as they are.
  for (const handler of [out.camera.shutter, out.browser.toggleMenu, out.photos.fav, out.files.sort, out.messages.t.who, out.inbox.d.forward]) assert.equal(handler[MARK], undefined);
  assert.equal(out.browser.toggleMenu, noop);
  // Should a later adapter still call one, it keeps saying so instead of doing nothing.
  out.maps.web();
  assert.deepEqual(toasts, ['Use Maps app']);
  assert.equal(adapter.UNAVAILABLE_CONTROL, MARK);
});

test('a reference view\'s chat-card actions are marked, so their cards offer no control for them', () => {
  const sendDraft = () => 'sent';
  const views = {messages: {render: () => ({}), actions: {sendDraft}}, notes: {render: () => ({}), actions: {save: sendDraft}}, settings: {render: () => ({})}};
  adapter.installPrototypeNativeAdapters(null, views);
  assert.equal(views.messages.actions.sendDraft[MARK], true);
  // Notes is this phone's own view; its actions are untouched.
  assert.equal(views.notes.actions.save, sendDraft);
  const toasts = [];
  views.messages.actions.sendDraft({}, {toast: message => toasts.push(message)});
  assert.deepEqual(toasts, ['Unavailable']);
});

test('the template drops an element bound to a marked handler', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  const saved = globalThis.document;
  globalThis.document = dom.window.document;
  try {
    const template = '<div class="os"><div data-screen>'
      + '<button onClick="{{gone}}">Read aloud<span>inside</span></button>'
      + '<input aria-label="Card number" onInput="{{gone}}">'
      + '<button onClick="{{kept}}">Shutter</button>'
      + '<button onClick="{{missing}}">Plain</button>'
      + '</div></div>';
    const {DCLogic} = await load('apps/app/src/prototype/dc-lite.js', {
      './template-source': `export default ${JSON.stringify(template)};`,
      '../icon-style': 'export const iconStyle=()=>({});',
    }, ['react']);
    class View extends DCLogic {renderVals() {return {gone: Object.assign(() => {}, {[MARK]: true}), kept: () => {}};}}
    const html = renderToStaticMarkup(React.createElement(View));
    assert.doesNotMatch(html, /Read aloud|inside|Card number/);
    assert.match(html, /Shutter/);
    assert.match(html, /Plain/);
  } finally {
    globalThis.document = saved;
  }
});
