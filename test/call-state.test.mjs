// AP-16 AC-19 on the Alpha image: the renderer side of Telecom's call state (runtime/call-state.ts)
// and the emergency source the shell gates on (runtime/comms-bar.ts). A stub plugin, no device.
import test from 'node:test';
import assert from 'node:assert/strict';

const C = await import('../apps/app/src/runtime/call-state.ts');
const B = await import('../apps/app/src/runtime/comms-bar.ts');

test('only the exact native shape is read, and the AC-19 rule is re-derived from it', () => {
  assert.deepEqual(C.parseCallState({inCall: true, emergency: true, emergencyLive: true}), {inCall: true, emergency: true, emergencyLive: true});
  assert.deepEqual(C.parseCallState({inCall: true, emergency: null, emergencyLive: false}), {inCall: true, emergency: null, emergencyLive: true}, 'an unknown call kind holds AC-19 even if the payload says otherwise');
  assert.deepEqual(C.parseCallState({inCall: null, emergency: null, emergencyLive: false}), {inCall: null, emergency: null, emergencyLive: false});
  for (const bad of [null, [], {}, {inCall: true, emergency: true}, {inCall: 'yes', emergency: false, emergencyLive: false}, {inCall: true, emergency: false, emergencyLive: false, extra: 1}])
    assert.equal(C.parseCallState(bad), null, JSON.stringify(bad));
});

test('the watch feeds the shell\'s emergency source from reads and Telephony events, and stops cleanly', async () => {
  const listeners = [];
  let answer = {inCall: false, emergency: false, emergencyLive: false};
  const plugin = {callState: async () => answer, addListener: async (event, listener) => { listeners.push(listener); return {remove() { listeners.length = 0; }}; }};
  globalThis.document = {hidden: false, addEventListener() {}, removeEventListener() {}};
  let redraws = 0;
  const stop = C.watchCallState(plugin, () => { redraws++; });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(B.deviceEmergencyLive(), false);
  const before = redraws;
  listeners[0]({inCall: true, emergency: true, emergencyLive: true});
  assert.equal(B.deviceEmergencyLive(), true);
  assert.equal(redraws, before + 1, 'a change redraws the shell');
  // A guard's fresh read sees the end of the call; a failed read keeps the last reading.
  answer = {inCall: false, emergency: false, emergencyLive: false};
  assert.equal((await C.readCallState(plugin)).emergencyLive, false);
  plugin.callState = async () => { throw Error('gone'); };
  assert.equal((await C.readCallState(plugin)).emergencyLive, false);
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
