// AP-16 AC-19 on the Alpha image: the side effects agent-adapter runs through prototype/image-telephony.ts
// (dial handoff, direct SMS send, telephony actions through the executor's ports), driven with the
// native bridge faked: the AlphaCallState plugin through the real fail-closed guard, and recording
// telephony and contacts clients. No device, Telecom, radio or address book is involved.
import test from 'node:test';
import assert from 'node:assert/strict';

const I = await import('../apps/app/src/prototype/image-telephony.ts');
const {telephonyEffectAllowed} = await import('../apps/app/src/runtime/call-state.ts');

const states = {
  idle: {inCall: false, emergency: false, emergencyLive: false, watching: true},
  ordinary: {inCall: true, emergency: false, emergencyLive: false, watching: true},
  emergency: {inCall: true, emergency: true, emergencyLive: true, watching: true},
  unknownKind: {inCall: true, emergency: null, emergencyLive: true, watching: true},
  unreadable: {inCall: null, emergency: null, emergencyLive: false, watching: false},
};
/** The AlphaCallState bridge: answers in turn (the last repeats); 'throw' rejects. */
function callState(...answers) {
  const plugin = {reads: 0, async callState() { const answer = answers[Math.min(plugin.reads++, answers.length - 1)]; if (answer === 'throw') throw Error('bridge'); return answer; },
    addListener: async () => ({remove() {}})};
  return plugin;
}
/** The native side the executor reaches: every side effect is recorded. */
function bridge() {
  const effects = [];
  const ports = {
    current() {}, normalize: value => value.replace(/[^+\d]/g, '') || null, ask: async () => 0,
    searchContacts: async () => [{id: '1', displayName: 'Ana Torres', phoneNumbers: ['+15555550101']}],
    getContact: async id => ({id, version: 'a'.repeat(64), displayName: 'Ana Torres', phoneNumbers: [{number: '+15555550101', type: 'mobile'}], emailAddresses: []}),
    placeCall: async number => { effects.push(['placeCall', number]); return {status: 'placed'}; },
    sendSms: async number => { effects.push(['sendSms', number]); return 'submitted'; },
    saveContact: async () => { effects.push(['saveContact']); return {status: 'saved'}; },
    removeContact: async id => { effects.push(['removeContact', id]); return {status: 'deleted'}; },
    draftInOpenThread: () => 'none-selected', openThread: () => null, openVoicemail: () => null, deleteOpenVoicemail: async () => 'none-selected',
  };
  const dial = async number => { effects.push(['dial', number]); return {status: 'handed-off'}; };
  const send = async () => { effects.push(['nativeSms']); return {status: 'submitted'}; };
  return {effects, ports, dial, send};
}
const operations = {
  call: {type: 'phone_call', target: {kind: 'number', number: '+15555550100'}},
  create: {type: 'contact_create', contact: {displayName: 'Ana Torres', phoneNumbers: ['+15555550101'], emailAddresses: []}},
  remove: {type: 'contact_delete', query: 'Ana'},
  text: {type: 'sms_compose', query: 'Ana', body: 'On my way'},
};
const signal = () => new AbortController().signal;
async function everyEffect(plugin, fence = () => {}) {
  const b = bridge();
  const guard = {allowed: () => telephonyEffectAllowed(plugin), fence};
  const results = {
    dial: await I.imageDialHandoff('+15555550100', b.dial, guard),
    sms: await I.imageSmsSend(b.send, guard),
  };
  for (const [name, operation] of Object.entries(operations)) results[name] = (await I.imageTelephonyAction(operation, `op-${name}`, {...b.ports, current: fence}, guard, signal())).status;
  return {effects: b.effects.map(row => row[0]), results};
}

test('with no call or an ordinary call, every image side effect runs once', async () => {
  for (const state of [states.idle, states.ordinary]) {
    const {effects} = await everyEffect(callState(state));
    assert.deepEqual(effects, ['dial', 'nativeSms', 'placeCall', 'saveContact', 'removeContact', 'sendSms']);
  }
});

test('during a call that may be an emergency call, or when the state cannot be read, nothing runs', async () => {
  for (const plugin of [callState(states.emergency), callState(states.unknownKind), callState(states.unreadable), callState('throw'), callState('malformed')]) {
    const {effects, results} = await everyEffect(plugin);
    assert.deepEqual(effects, []);
    assert.deepEqual([results.dial, results.sms], [null, null], 'the dial screen never opens and the SMS is never sent');
    assert.notEqual(results.call, 'succeeded');
    assert.notEqual(results.text, 'succeeded');
  }
});

test('the guard is read right before each effect: a call that starts after the review began still stops it', async () => {
  // The executor's own reads (contact lookup, review) happen first; Telecom changes before the effect.
  const b = bridge();
  let state = states.idle;
  const plugin = {callState: async () => state, addListener: async () => ({remove() {}})};
  const guard = {allowed: () => telephonyEffectAllowed(plugin), fence: () => {}};
  const ports = {...b.ports, ask: async () => { state = states.emergency; return 0; }};
  await I.imageTelephonyAction(operations.remove, 'op', ports, guard, signal());
  await I.imageTelephonyAction(operations.text, 'op2', ports, guard, signal());
  assert.deepEqual(b.effects, []);
});

test('a review that ends while Telecom is read acts on nothing', async () => {
  let current = true;
  const fence = () => { if (!current) throw Error('review changed'); };
  const plugin = {callState: async () => { current = false; return states.idle; }, addListener: async () => ({remove() {}})};
  const b = bridge();
  const guard = {allowed: () => telephonyEffectAllowed(plugin), fence};
  await assert.rejects(I.imageDialHandoff('+15555550100', b.dial, guard), /review changed/);
  current = true;
  await assert.rejects(I.imageSmsSend(b.send, guard), /review changed/);
  current = true;
  await I.imageTelephonyAction(operations.call, 'op', {...b.ports, current: fence}, guard, signal()).catch(() => {});
  assert.deepEqual(b.effects, []);
});
