// AP-16 AC-19 on the Alpha image: the renderer side of Telecom's call state (runtime/call-state.ts)
// and the emergency source the shell gates on (runtime/comms-bar.ts). A stub plugin, no device.
import test from 'node:test';
import assert from 'node:assert/strict';

const C = await import('../apps/app/src/runtime/call-state.ts');
const B = await import('../apps/app/src/runtime/comms-bar.ts');

test('only the exact native shape is read, and the AC-19 rule is re-derived from it', () => {
  assert.deepEqual(C.parseCallState({inCall: true, emergency: true, emergencyLive: true, watching: true}), {inCall: true, emergency: true, emergencyLive: true, watching: true});
  assert.deepEqual(C.parseCallState({inCall: true, emergency: null, emergencyLive: false, watching: true}), {inCall: true, emergency: null, emergencyLive: true, watching: true}, 'an unknown call kind holds AC-19 even if the payload says otherwise');
  assert.deepEqual(C.parseCallState({inCall: null, emergency: null, emergencyLive: false, watching: false}), {inCall: null, emergency: null, emergencyLive: false, watching: false});
  for (const bad of [null, [], {}, {inCall: true, emergency: true, emergencyLive: true}, {inCall: 'yes', emergency: false, emergencyLive: false}, {inCall: true, emergency: false, emergencyLive: false, extra: 1}])
    assert.equal(C.parseCallState(bad), null, JSON.stringify(bad));
});

test('the watch feeds the shell\'s emergency source from reads and Telephony events, and stops cleanly', async () => {
  const listeners = [];
  let answer = {inCall: false, emergency: false, emergencyLive: false, watching: true};
  const plugin = {callState: async () => answer, addListener: async (event, listener) => { listeners.push(listener); return {remove() { listeners.length = 0; }}; }};
  globalThis.document = {hidden: false, addEventListener() {}, removeEventListener() {}};
  let redraws = 0;
  const stop = C.watchCallState(plugin, () => { redraws++; });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(B.deviceEmergencyLive(), false);
  const before = redraws;
  listeners[0]({inCall: true, emergency: true, emergencyLive: true, watching: true});
  assert.equal(B.deviceEmergencyLive(), true);
  assert.equal(redraws, before + 1, 'a change redraws the shell');
  // The display keeps its last reading when a read fails.
  answer = {inCall: false, emergency: false, emergencyLive: false, watching: true};
  assert.equal((await C.readCallState(plugin)).emergencyLive, false);
  const working = plugin.callState;
  plugin.callState = async () => { throw Error('gone'); };
  assert.equal((await C.readCallState(plugin)).emergencyLive, false);
  plugin.callState = working;
  listeners[0]('malformed');
  assert.equal(B.deviceEmergencyLive(), false);
  stop();
  assert.equal(B.deviceEmergencyLive(), false, 'no source after stop');
  delete globalThis.document;
});

test('a source that throws counts as an emergency call', () => {
  B.setEmergencySource(() => { throw Error('unreadable'); });
  assert.equal(B.deviceEmergencyLive(), true);
  B.setEmergencySource(null);
  assert.equal(B.deviceEmergencyLive(), false);
});

test('the side-effect guard fails closed: only a fresh, readable reading that rules out an emergency call allows it', async () => {
  const at = answer => ({callState: async () => answer, addListener: async () => ({remove() {}})});
  assert.equal(await C.telephonyEffectAllowed(at({inCall: false, emergency: false, emergencyLive: false, watching: true})), true);
  assert.equal(await C.telephonyEffectAllowed(at({inCall: true, emergency: false, emergencyLive: false, watching: true})), true, 'an ordinary call');
  assert.equal(await C.telephonyEffectAllowed(at({inCall: true, emergency: true, emergencyLive: true, watching: true})), false);
  assert.equal(await C.telephonyEffectAllowed(at({inCall: true, emergency: null, emergencyLive: false, watching: true})), false, 'unknown kind');
  assert.equal(await C.telephonyEffectAllowed(at({inCall: null, emergency: null, emergencyLive: false, watching: false})), false, 'unreadable phone state');
  assert.equal(await C.telephonyEffectAllowed(at('malformed')), false);
  assert.equal(await C.telephonyEffectAllowed({callState: async () => { throw Error('bridge'); }, addListener: async () => ({remove() {}})}), false, 'a failed read');
});

test('every image side-effect port is behind the guard, read right before it', async () => {
  const done = [];
  const ports = {placeCall: async n => { done.push(['call', n]); return {status: 'placed'}; }, sendSms: async () => { done.push(['sms']); return 'submitted'; },
    saveContact: async () => { done.push(['save']); return {status: 'saved'}; }, removeContact: async () => { done.push(['remove']); return {status: 'deleted'}; }, other: 1};
  let allow = false;
  const guarded = C.guardTelephonyPorts(ports, async () => allow);
  assert.deepEqual([await guarded.placeCall('+1'), await guarded.sendSms('+1', 'x', 'op', new AbortController().signal), await guarded.saveContact({}), await guarded.removeContact('1', 'v')],
    [{status: 'busy'}, 'cancelled', {status: 'failed'}, {status: 'failed'}]);
  assert.deepEqual(done, []);
  allow = true;
  await guarded.placeCall('+1'); await guarded.sendSms('+1', 'x', 'op', new AbortController().signal); await guarded.saveContact({}); await guarded.removeContact('1', 'v');
  assert.deepEqual(done.map(row => row[0]), ['call', 'sms', 'save', 'remove']);
  assert.equal(guarded.other, 1, 'other ports are unchanged');
});
