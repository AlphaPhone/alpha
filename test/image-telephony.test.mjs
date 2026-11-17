// AP-16 AC-19 on the Alpha image: the side effects agent-adapter runs through prototype/image-telephony.ts
// (dial handoff, direct SMS send, telephony actions through the executor's ports), driven with the
// native bridge faked: the AlphaCallState plugin through the real fail-closed guard, and recording
// telephony and contacts clients. No device, Telecom, radio or address book is involved.
import test from 'node:test';
import assert from 'node:assert/strict';

const I = await import('../apps/app/src/prototype/image-telephony.ts');
const C = await import('../apps/app/src/prototype/contacts-changes.ts');
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

test('a guard refusal is the phone\'s, in the guard\'s words: not another call, not the owner\'s dismissal', async () => {
  const b = bridge(), guard = {allowed: () => telephonyEffectAllowed(callState(states.emergency))};
  const expected = {call: {kind: 'phone-call', status: 'unavailable', contact: false}, text: {kind: 'sms-compose', status: 'unavailable'}, create: {kind: 'contact-write', status: 'failed'}, remove: {kind: 'contact-write', status: 'failed'}};
  for (const [name, telephonyResult] of Object.entries(expected)) {
    const result = await I.imageTelephonyAction(operations[name], `op-${name}`, b.ports, guard, signal());
    assert.deepEqual(result, {status: 'failed', summary: I.EMERGENCY_REFUSAL, telephonyResult}, name);
  }
  assert.deepEqual(b.effects, []);
  // An allowed action keeps its own receipt text.
  const placed = await I.imageTelephonyAction(operations.call, 'op', b.ports, {allowed: () => telephonyEffectAllowed(callState(states.idle))}, signal());
  assert.equal(placed.status, 'succeeded'); assert.notEqual(placed.summary, I.EMERGENCY_REFUSAL);
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

// The executor's sendSms port (imageSmsPort) against a recording telephony client: which SIM the
// review names and what each native answer is reported as. No SIM, radio or dialog is involved.
const {SmsSendNotAttempted} = await import('../.eliza/client-features/packages/contracts/src/native-telephony.ts');
const {smsSubscriptionRevision} = await import('../apps/app/src/runtime/sms-subscription-revision.ts');
const sims = [{id: 1, slot: 0, displayName: 'Personal', carrierName: 'Carrier A', defaultSms: false, defaultVoice: true}, {id: 2, slot: 1, displayName: 'Work', carrierName: 'Carrier B', defaultSms: true, defaultVoice: false}];
function smsClient({subscriptions = [sims[0]], defaultSms = null, send = async () => ({status: 'submitted'}), journal = []} = {}) {
  const calls = [];
  return {calls,
    status: async () => { calls.push(['status']); return {subscriptions, defaultSmsSubscriptionId: defaultSms}; },
    sendSms: async (review, id) => { calls.push(['send', review, id]); return send(); },
    smsSendResult: async (review, id) => { calls.push(['read', review.subscriptionId, id]); const next = journal.shift(); if (next === 'throw') throw Error('journal'); return {status: next ?? 'submitted'}; },
    cancelSmsReview: async id => { calls.push(['cancel', id]); },
  };
}
const home = {view: 'home', selectedObject: null};
const text = (client, context = home, current = () => {}) => I.imageSmsPort(client, context, current, async () => {})('+15555550101', 'On my way', 'op-1', signal());
const sent = client => client.calls.filter(([kind]) => kind === 'send');

test('with two SIMs and nothing selected, a text from Home is reviewed on the default SMS SIM', async () => {
  let client = smsClient({subscriptions: sims, defaultSms: 2, journal: ['sent']});
  assert.equal(await text(client), 'sent');
  assert.deepEqual(sent(client), [['send', {recipients: ['+15555550101'], body: 'On my way', subscriptionId: 2}, 'op-1']]);
  // No default among several SIMs: nothing can be reviewed, and nothing is sent.
  client = smsClient({subscriptions: sims});
  assert.equal(await text(client), 'unavailable'); assert.equal(sent(client).length, 0);
  // The SIM selected in Messages wins over the default; a selection that no longer matches sends nothing.
  const selected = {view: 'messages', selectedObject: {kind: 'sms-subscription', id: '1', revision: smsSubscriptionRevision(sims[0])}};
  client = smsClient({subscriptions: sims, defaultSms: 2, journal: ['sent']});
  await text(client, selected); assert.equal(sent(client)[0][1].subscriptionId, 1);
  client = smsClient({subscriptions: sims, defaultSms: 2});
  assert.equal(await text(client, {...selected, selectedObject: {...selected.selectedObject, revision: 'slot0-00000000'}}), 'unavailable'); assert.equal(sent(client).length, 0);
});

test('nothing sent is never reported as unknown or as the owner dismissing it', async () => {
  const coded = code => Object.assign(Error('refused'), {code});
  const refusals = {
    'the status read fails': smsClient({subscriptions: sims, defaultSms: 2, send: async () => ({status: 'submitted'})}),
    'another review is open': smsClient({send: async () => { throw new SmsSendNotAttempted('op-1', 'busy'); }}),
    'the review could not be shown': smsClient({send: async () => { throw new SmsSendNotAttempted('op-1', 'closed'); }}),
    'native rejects as unavailable': smsClient({send: async () => { throw coded('unavailable'); }}),
    'native rejects as expired': smsClient({send: async () => { throw coded('expired'); }}),
    'the phone denies the send': smsClient({send: async () => ({status: 'denied'})}),
  };
  refusals['the status read fails'].status = async () => { throw Error('bridge'); };
  for (const [name, client] of Object.entries(refusals)) assert.equal(await text(client), 'unavailable', name);
  // The review ended while the SIMs were read: nothing was sent.
  const client = smsClient();
  assert.equal(await text(client, home, () => { throw Error('Phone context changed'); }), 'unavailable'); assert.equal(sent(client).length, 0);
  // The owner's own dismissal of the native review stays a dismissal; a lost answer stays unknown.
  assert.equal(await text(smsClient({send: async () => ({status: 'cancelled'})})), 'cancelled');
  await assert.rejects(text(smsClient({send: async () => { throw Error('bridge closed'); }})), /bridge closed/);
  // Through the executor each reads as it should.
  const b = bridge(), guard = {allowed: async () => true};
  const through = async client => (await I.imageTelephonyAction(operations.text, 'op-1', {...b.ports, sendSms: I.imageSmsPort(client, home, () => {}, async () => {})}, guard, signal())).telephonyResult.status;
  assert.equal(await through(refusals['the phone denies the send']), 'unavailable');
  assert.equal(await through(smsClient({send: async () => { throw Error('bridge closed'); }})), 'unknown');
});

test('a submitted text is watched briefly, so a message the radio refused is not reported as handed over', async () => {
  let client = smsClient({journal: ['submitted', 'failed']});
  assert.equal(await text(client), 'failed');
  assert.deepEqual(client.calls.filter(([kind]) => kind === 'read'), [['read', 1, 'op-1'], ['read', 1, 'op-1']], 'the send record is read, never sent again');
  assert.equal(sent(client).length, 1);
  assert.equal(await text(smsClient({journal: ['delivered']})), 'delivered');
  // Still submitted when the bounded wait ends, or the record cannot be read: it stays "submitted".
  client = smsClient();
  assert.equal(await text(client), 'submitted'); assert.equal(client.calls.filter(([kind]) => kind === 'read').length, I.SMS_SETTLE.reads);
  assert.equal(await text(smsClient({journal: ['throw']})), 'submitted');
  // An answer that is already final is not read again.
  client = smsClient({send: async () => ({status: 'sent'})});
  assert.equal(await text(client), 'sent'); assert.equal(client.calls.filter(([kind]) => kind === 'read').length, 0);
});

// The executor's contact ports (imageContactPorts) against a recording address book.
function addressBook({writable = true, grants = true, save = {status: 'saved', id: '7', version: 'b'.repeat(64)}} = {}) {
  const calls = [];
  const access = allowed => ({available: true, readable: true, writable: allowed});
  return {calls,
    status: async () => { calls.push('status'); return access(writable); },
    requestPermissions: async () => { calls.push('requestPermissions'); return access(grants); },
    get: async () => { throw Error('unused'); },
    save: async options => { calls.push(['save', options]); return save; },
    remove: async options => { calls.push(['remove', options]); return {status: 'deleted'}; },
  };
}
test('a contact write asks for write access when it is missing, and without it nothing is written', async () => {
  const draft = {displayName: 'Ana Torres', phoneNumbers: [], emailAddresses: []};
  let book = addressBook();
  assert.deepEqual(await I.imageContactPorts(book, () => {}).saveContact(draft), {status: 'saved'});
  assert.deepEqual(book.calls, ['status', ['save', draft]], 'access already granted: no prompt');
  book = addressBook({writable: false});
  assert.deepEqual(await I.imageContactPorts(book, () => {}).removeContact('1', 'a'.repeat(64)), {status: 'deleted'});
  assert.deepEqual(book.calls.slice(0, 2), ['status', 'requestPermissions'], 'the owner is asked, as the Contacts editor asks');
  book = addressBook({writable: false, grants: false});
  await assert.rejects(I.imageContactPorts(book, () => {}).saveContact(draft), {code: 'permission-required'});
  assert.deepEqual(book.calls, ['status', 'requestPermissions']);
  // Through the executor that refusal reads "nothing was changed", for a create, an update and a delete.
  const b = bridge(), guard = {allowed: async () => true};
  for (const operation of [operations.create, operations.remove, {type: 'contact_update', query: 'Ana', set: {displayName: 'Ana T'}}]) {
    book = addressBook({writable: false, grants: false});
    const result = await I.imageTelephonyAction(operation, 'op', {...b.ports, ...I.imageContactPorts(book, () => {}), getContact: b.ports.getContact}, guard, signal());
    assert.deepEqual(result.telephonyResult, {kind: 'contact-write', status: 'unavailable'}, operation.type);
    assert.match(result.summary, /Nothing was changed/); assert.equal(book.calls.some(call => Array.isArray(call)), false);
  }
});

test('a contact write that reached the address book, or may have, is announced to the Contacts view', async () => {
  const heard = [], stop = C.onContactsChanged(change => heard.push(change.unconfirmed ? 'unknown' : 'written'));
  try {
    const guard = {allowed: async () => true};
    const run = (operation, ports = {}) => I.imageTelephonyAction(operation, 'op', {...bridge().ports, ...ports}, guard, signal());
    await run(operations.create); await run(operations.remove);
    await run(operations.create, {saveContact: async () => { throw Error('Reply lost after commit'); }});
    assert.deepEqual(heard, ['written', 'written', 'unknown']);
    // Nothing written, and other telephony actions: no announcement.
    await run(operations.remove, {ask: async () => null}); await run(operations.remove, {removeContact: async () => ({status: 'stale'})});
    await run(operations.call); await run(operations.text);
    assert.equal(heard.length, 3);
  } finally { stop(); }
});
