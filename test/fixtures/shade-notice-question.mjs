import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {stripTypeScriptTypes} from '../support/strip-types.mjs';
import {sensitiveReadingText} from '../../.eliza/client-features/plugins/plugin-native-browser-surface/src/page-reading.ts';

const adapter = new URL('../../apps/app/src/prototype/notifications-adapter.ts', import.meta.url);
const selection = new URL('../../apps/app/src/prototype/context-selection.ts', import.meta.url);
const staging = new URL('../../apps/app/src/prototype/own-notice-question.ts', import.meta.url);
export const shadeNoticeQuestionSources = [import.meta.url, adapter, selection, staging,
  new URL('../../.eliza/client-features/plugins/plugin-native-browser-surface/src/page-reading.ts', import.meta.url),
  new URL('../support/strip-types.mjs', import.meta.url), new URL('../../bun.lock', import.meta.url)].map(fileURLToPath);

const tick = () => new Promise(resolve => setImmediate(resolve));
function range(source, start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, 'The actual source slice must remain available: ' + start);
  return source.slice(a, b);
}

/** Real adapter and attachment staging; shell and list/composer ports are closed. */
export function shadeNoticeQuestionFixture({initialRows} = {}) {
  const a = readFileSync(adapter, 'utf8'), s = readFileSync(selection, 'utf8');
  const code = stripTypeScriptTypes([range(s, 'const OPAQUE = ', '\n'),
    range(s, 'const sessionMarker = ', '\n'),
    range(s, 'export const ASKABLE_NOTICE_KINDS', 'export type CaptureSelection'),
    range(a, 'const opaque', 'type Notice ='), a.slice(a.indexOf('export function installNotificationsAdapter')),
    readFileSync(staging, 'utf8').replace(/^import .*?;?\n/gm, ''), 'installNotificationsAdapter(Shell);',
  ].join('\n').replace(/^export /gm, ''));
  const dom = new JSDOM('<!doctype html><body></body>', {pretendToBeVisual: true});
  const {window} = dom, {document} = window;
  window.setInterval = () => 1;
  let hidden = false;
  Object.defineProperty(document, 'hidden', {get: () => hidden});
  const rows = initialRows ? structuredClone(initialRows) : ['a', 'b'].map(id => ({id: 'reminder:' + id, revision: 'revision-' + id, source: 'own', kind: 'reminder',
    title: 'Saved ' + id, text: 'Synthetic text ' + id, appLabel: 'Alpha Phone', at: 0, canOpen: true}));
  const requests = [], drafts = [], toasts = [];
  const leases = new WeakMap(), admission = new Map(), reviews = [], composed = [], reported = [];
  let settling = 0, staleEffect = false;
  const leaseId = () => leases.get(shell.alphaNoticeQuestionLease) ?? 0;
  const observeEffect = () => {if (settling && leaseId() !== settling) staleEffect = true;};
  class Shell {
    state = {shade: true, view: 'home', screen: 'home'};
    S() {return this.state;}
    renderVals() {return {ic: {bell: 'icon'}};}
    componentDidMount() {}
    componentDidUpdate() {}
    componentWillUnmount() {}
    setState(patch) {
      const previous = this.state;
      this.state = {...previous, ...patch};
      this.renderVals();
      this.componentDidUpdate(undefined, previous);
    }
    swallowed() {return false;}
    sw() {return {};}
    toast(message) {
      toasts.push(message);
      if (!settling) return;
      observeEffect();
      assert.ok(['Gone','Couldn’t check'].includes(message));
      reported.push({id: settling, result: message === 'Couldn’t check' ? 'unavailable' : 'changed'});
    }
    api() {return {async attachSelectedFile(selection) {
      const id=leaseId();
      const file=await selection.read(selection.current);
      if(!file||!selection.current())return false;
      const accepted=await new Promise(resolve=>admission.set(id,resolve));
      admission.delete(id);
      if(!accepted||!selection.current()||!await selection.commit(selection.current)||!selection.current())return false;
      const text=await file.text();
      assert.equal(file.name,'Alpha Phone notification.txt');
      assert.equal(selection.prompt,'Help me with this notification.');
      drafts.push(text);
      observeEffect();
      const notice = rows.find(row => text===row.title + '\n' + row.text);
      assert.ok(notice, 'The actual staging sends the exact synthetic excerpt to the closed composer');
      composed.push({id: settling, notice: notice.id.slice(-1)});
      shell.setState({shade: false, draft: selection.prompt});
      return true;
    }};}
  }
  const native = {list() {
    if (shell.alphaNoticesBusy) return Promise.resolve({items: structuredClone(rows)});
    return new Promise((resolve, reject) => requests.push({id: leaseId(), pending: true, resolve, reject}));
  }};
  const box = vm.createContext({Shell, window, document, File, AbortController, queueMicrotask,
    native, crypto, Capacitor: {isNativePlatform: () => false}, sensitiveReadingText,
    alphaClient:{getState:()=>({context:{sensitive:false}})},
    formatTime: () => 'time', clearInterval() {}});
  vm.runInContext(code, box);
  const shell = new Shell();
  shell.componentDidMount();
  shell.alphaNotices = structuredClone(rows);
  const settle = async (index, result) => {
    const request = requests[index];
    assert.ok(request?.pending);
    request.pending = false;
    settling = request.id;
    result(request);
    await tick();
    settling = 0;
  };
  return {rows, requests, drafts, toasts,
    selection:()=>structuredClone(shell.notificationSelection()),
    rawSelection:()=>structuredClone(shell.alphaNoticeSelection),
    async refresh(){await shell.refreshAlphaNotices();await tick();},
    async ask(id) {
      const row = shell.renderVals().shadeN.find(row => row.id === id || row.id === 'reminder:' + id);
      assert.ok(row?.canAsk);
      row.ask();
      const review = reviews.length + 1;
      assert.ok(shell.alphaNoticeQuestionLease);
      leases.set(shell.alphaNoticeQuestionLease, review);
      reviews.push([review, id]);
      await tick();
    },
    async admit() {
      const pending=admission.get(leaseId());
      assert.ok(pending);
      pending(true);
      await tick();
    },
    async cancel() {
      const pending=admission.get(leaseId());
      assert.ok(pending);
      pending(false);await tick();
    },
    finish: (index, items = rows) => settle(index, request => request.resolve({items: structuredClone(items)})),
    refuse: index => settle(index, request => request.reject(Error('Synthetic list unavailable'))),
    async set(patch) {shell.setState(patch);await tick();},
    async visibility(value) {
      hidden = value;
      document.dispatchEvent(new window.Event('visibilitychange'));
      await tick();
    },
    async deviceState() {window.dispatchEvent(new window.Event('alpha:device-state'));await tick();},
    unmount() {shell.componentWillUnmount();},
    observe() {
      return {shade: shell.state.shade, screen: shell.state.screen, hidden, live: shell.alphaNoticesLive,
        epoch: shell.alphaNoticeEpoch, owner: leaseId(), queued: admission.has(leaseId())?leaseId():0,
        reviews: [...reviews], pending: requests.filter(request => request.pending).map(request => request.id),
        composed: [...composed], reported: [...reported], staleEffect};
    },
    close() {if (shell.alphaNoticesLive) shell.componentWillUnmount();for(const done of admission.values())done(false);window.close();},
  };
}
