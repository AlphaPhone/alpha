import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';

const adapter = readFileSync('apps/app/src/prototype/agent-adapter.ts', 'utf8');
const gateStart = adapter.indexOf('  function updateBackAvailability('), gateEnd = adapter.indexOf('  const notesLeave=', gateStart);
assert.ok(gateStart >= 0 && gateEnd > gateStart);
const gate = stripTypeScriptTypes(adapter.slice(gateStart, gateEnd), {mode: 'strip'});
const model = readFileSync('apps/app/src/prototype/model.js', 'utf8');
const backStart = model.indexOf('  back() {'), backEnd = model.indexOf("  /* ---- Android's notification shade", backStart);
assert.ok(backStart >= 0 && backEnd > backStart);

const rest = {view: null, drawer: false, shade: false, chat: 'input', voice: 'off', stack: []};
function shell(initial) {
  const context = vm.createContext({});
  vm.runInContext(`class Shell {
    constructor(state){this.state=state;this.props={};this.changes=0;this.voiceStops=0;}
    S(){return {...this.state};}
    setState(patch){Object.assign(this.state,patch);this.changes++;}
    rest(){return this.state.view?'hidden':'input';}
    stopVoice(){this.voiceStops++;this.setState({voice:'off'});}
    closeAssistant(){} mod(){return {};} vget(){return {};} api(){return {};} openView(){}
    goHome(){this.setState({view:null,drawer:false,chat:'input',stack:[]});}
    ${model.slice(backStart, backEnd)}
  }
  globalThis.make=state=>new Shell(state);`, context);
  return context.make({...rest, ...initial});
}
function canGoBack(state, {dialog = false, connection = false} = {}) {
  const dataset = {};
  const context = vm.createContext({String, document: {documentElement: {dataset}, querySelector: () => dialog ? {} : null}, connectionController: {getSnapshot: () => ({open: connection})}});
  vm.runInContext(`${gate}\nglobalThis.update=updateBackAvailability;`, context);
  context.update({S: () => ({...rest, ...state})});
  return dataset.alphaCanGoBack;
}

test('native Back is offered while the All-apps drawer is open at Home', () => {
  assert.equal(canGoBack({}), 'false');
  assert.equal(canGoBack({drawer: true}), 'true');
});

test('native Back is offered exactly when the shell Back handler would change state', () => {
  const cases = [{}, {drawer: true}, {shade: true}, {view: 'notes'}, {chat: 'sheet'}, {chat: 'full'}, {voice: 'listening'}, {drawer: true, chat: 'sheet'}, {view: 'notes', chat: 'hidden'}];
  for (const state of cases) {
    const instance = shell(state);
    instance.back();
    assert.equal(canGoBack(state), String(instance.changes > 0), JSON.stringify(state));
  }
});

test('Back lowers an open conversation before the drawer underneath it', () => {
  const instance = shell({drawer: true, chat: 'full'});
  instance.back();
  assert.deepEqual([instance.state.chat, instance.state.drawer], ['sheet', true]);
  instance.back();
  assert.deepEqual([instance.state.chat, instance.state.drawer], ['input', true]);
  instance.back();
  assert.deepEqual([instance.state.chat, instance.state.drawer, instance.state.drawerQ], ['input', false, '']);
});

test('Back ends voice before closing the drawer, and closes a bare drawer first', () => {
  const speaking = shell({drawer: true, voice: 'listening'});
  speaking.back();
  assert.deepEqual([speaking.voiceStops, speaking.state.drawer], [1, true]);
  const bare = shell({drawer: true});
  bare.back();
  assert.equal(bare.state.drawer, false);
});
