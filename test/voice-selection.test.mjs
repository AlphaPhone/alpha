import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';

// Real voice-selection source with a synthetic Cloud session and an in-memory Storage.
// "Restart" evaluates the source again in a fresh context over the same stored bytes.
function storage(bytes = new Map()) {
  return {bytes, getItem: key => bytes.has(key) ? bytes.get(key) : null, setItem: (key, value) => { bytes.set(key, String(value)); }, removeItem: key => { bytes.delete(key); }};
}
function load(store, f = {account: true}) {
  if (typeof f === 'boolean') f = {account: true, mocks: f};
  const box = {
    cloudRuntimeEnabled: f.cloud === true, testMocksEnabled: f.mocks === true, localStorage: store,
    connectionController: {getSnapshot:()=>({residentInference:f.direct?'direct':'cloud',providerStatus:{voiceConfigured:f.voice===true}}),getCloudEnvironment: () => f.account ? 'production' : null, getCloudClient: () => f.account ? {sessionId: 'synthetic-session', credentialId: 'synthetic-credential'} : null},
  };
  const source = fs.readFileSync('apps/app/src/runtime/voice-selection.ts', 'utf8').replace(/^import .*;\n/gm, '').replaceAll('export function', 'function').replaceAll('export type', 'type');
  vm.runInNewContext('{' + stripTypeScriptTypes(source, {mode: 'transform'}) + '\nglobalThis.api={selectVoiceRoute,voiceSendPolicy,setVoiceSendPolicyForTests};}', box);
  return box.api;
}

test('production keeps speech local regardless of account, stored legacy route or requested fallback', () => {
  const legacy = new Map([['alphaphone:voice-route:v1', JSON.stringify({version: 1, route: 'cloud', disclosed: 'cloud-speech-uses-plan', chosenAt: 1})]]);
  for (const account of [true, false]) for (const store of [storage(), storage(legacy)]) {
    const v=load(store, {account});
    for(const requested of ['default','device','manual','agent']) assert.equal(v.selectVoiceRoute(requested),'device');
  }
});

test('the voice send policy defaults to auto-send and only test-mocks builds can exercise review', () => {
  const production = load(storage());
  assert.equal(production.voiceSendPolicy(), 'auto-send');
  assert.equal(production.setVoiceSendPolicyForTests('review'), false);
  assert.equal(production.voiceSendPolicy(), 'auto-send');
  const mocks = load(storage(), true);
  assert.equal(mocks.voiceSendPolicy(), 'auto-send');
  assert.equal(mocks.setVoiceSendPolicyForTests('review'), true);
  assert.equal(mocks.voiceSendPolicy(), 'review');
  assert.equal(mocks.setVoiceSendPolicyForTests('anything'), true);
  assert.equal(mocks.voiceSendPolicy(), 'auto-send', 'an unknown policy falls back to the constant');
});

test('an old Read replies aloud value does not change the route', () => {
  const store = storage();
  store.bytes.set('alphaphone:speak-replies:v1', '{"version":1,"enabled":true}');
  assert.equal(load(store).selectVoiceRoute(), 'device');
});

test('explicit production Cloud profile never silently selects local speech or enables mocks', () => {
  for(const account of [true,false]) {
    const v=load(storage(),{cloud:true,account});
    for(const route of ['default','device','agent','manual'])assert.equal(v.selectVoiceRoute(route),'cloud');
    assert.equal(v.setVoiceSendPolicyForTests('review'),false);
  }
});

test('explicit own keys choose the resident network voice route without a Cloud account',()=>{
 for(const voice of [true,false]){
  const v=load(storage(),{direct:true,voice,account:false});
  assert.equal(v.selectVoiceRoute('default'),'cloud');assert.equal(v.selectVoiceRoute('agent'),'cloud');assert.equal(v.selectVoiceRoute('device'),'device');
 }
});
