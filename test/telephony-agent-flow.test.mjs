// Owner-approved telephony actions through Alpha's device-action client (AP-08): approve → journal →
// claim → execute → receipt. Recording request, journal and executor stubs: no device, Telecom,
// address book or radio is involved. A `placed` receipt proves only that the executor reported it.
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'telephony-flow-'));
process.on('exit', () => rmSync(dir, {recursive: true, force: true}));
const output = await build({entryPoints: [resolve('apps/app/src/runtime/device-actions.ts')], bundle: true, format: 'esm', platform: 'node', write: false});
writeFileSync(join(dir, 'sdk.mjs'), output.outputFiles[0].text);
const {DeviceActions} = await import(pathToFileURL(join(dir, 'sdk.mjs')));
const P = await import('../apps/app/src/runtime/phone-context.ts');

const context = {view: 'home', revision: 1, sensitive: false};
const session = {ownerId: 'owner', agentId: 'agent', origin: 'https://agent.example', sessionId: 'session'};
const id = '5d1f0d2a-7f0e-4c8a-9a51-0e6c1c1f9b20', digest = 'd'.repeat(64);
const messageId = '77bc5ac9-0000-4000-8000-a61a04b11111';
const proof = {messageId, text: 'Help with this conversation', current() {}};
const ALL = ['phone.call.v1', 'contacts.write.v1', 'contacts.write.v2', 'contacts.show.v1', 'contacts.read.v1', 'sms.compose.v1', 'sms.compose.v2', 'messages.read.v1', 'voicemail.read.v1', 'voicemail.delete.v1'];
const callPriya = {type: 'phone_call', target: {kind: 'contact', query: 'Priya'}};
function fixture({capabilities = ALL, operation = callPriya, result = {kind: 'phone-call', status: 'placed', contact: true}, status = 'succeeded', receiptOutage = false, requestMessageId, present} = {}) {
  let state = 'pending', attemptId, effects = 0, entry;
  const posts = [];
  const proposal = () => ({id, digest, state, subjectUserId: 'owner', requestedBy: 'agent', action: 'device_action', expiresAt: new Date(Date.now() + 600000).toISOString(),
    payload: {action: 'device_action', version: 1, installationId: 'device', enrollmentId: 'enrollment', operation, requestMessageId}, execution: attemptId ? {attemptId, providerIdempotencyKey: id} : null});
  const request = async (path, body) => {
    if (body === undefined) return {proposals: [proposal()]};
    posts.push({path, body});
    if (path.endsWith('/decision')) state = 'approved';
    if (path.endsWith('/claim')) { state = 'executing'; attemptId = 'attempt'; }
    if (path.endsWith('/receipt')) { if (receiptOutage) throw Error('offline'); state = body.receipt.outcome === 'applied' ? 'done' : 'reconciliation_required'; }
    return {proposal: proposal(), digest};
  };
  const journal = {reserve: async input => { if (entry) return {created: false, entry}; entry = {...input, phase: 'reserved'}; return {created: true, entry}; },
    markApplying: async input => Object.assign(entry, {phase: 'applying', attemptId: input.attemptId}), finish: async input => Object.assign(entry, input, {phase: 'terminal'}),
    get: async () => ({entry}), list: async () => ({entries: entry ? [entry] : []})};
  const seen = [];
  const client = new DeviceActions(session, {installationId: 'device', enrollmentId: 'enrollment', key: 'a'.repeat(64), capabilities}, 'c'.repeat(64), request, journal,
    async (op, operationId) => { effects++; seen.push(operationId); assert.deepEqual(op, operation); return {status, summary: 'done', ...(result ? {telephonyResult: result} : {}), ...(present ? {present: () => present(posts.map(post => post.path.split('/').pop()))} : {})}; });
  return {client, posts, seen, get entry() { return entry; }, get effects() { return effects; }, online() { receiptOutage = false; }};
}
const signal = () => new AbortController().signal;
const receiptOf = f => f.posts.find(post => post.path.endsWith('/receipt'))?.body.receipt;

test('the phone advertises telephony actions only on the image and only what the agent offers', () => {
  const profile = {android: true, native: true, aospImage: true};
  const offered = [...ALL, 'sms.send.v1'];
  assert.deepEqual(P.selectDeviceCapabilities(offered, profile).filter(capability => ALL.includes(capability)).sort(), [...ALL].sort());
  assert.deepEqual(P.selectDeviceCapabilities(['phone.call.v1'], profile).filter(capability => ALL.includes(capability)), ['phone.call.v1']);
  assert.deepEqual(P.selectDeviceCapabilities(offered, {...profile, aospImage: false}).filter(capability => ALL.includes(capability)), [], 'a standalone install advertises none');
  // A form that extends an action is never advertised without the action it extends.
  assert.deepEqual(P.selectDeviceCapabilities(['sms.compose.v2', 'contacts.write.v2'], profile).filter(capability => ALL.includes(capability)), []);
});
test('a text to a number, a draft, a single contact value, a contact search and the open contact each need their own capability and say what they do', async () => {
  const number = {type: 'sms_compose', target: {kind: 'number', number: '+14155550100'}, body: 'Running late'};
  const add = {type: 'contact_update', query: 'Priya', add: {phoneNumbers: ['+14155550100']}, remove: {emailAddresses: ['p@example.com']}};
  const without = capability => ALL.filter(other => other !== capability);
  for (const [operation, capability] of [[number, 'sms.compose.v2'], [add, 'contacts.write.v2'], [{type: 'contact_show', query: 'Priya'}, 'contacts.show.v1']])
    await assert.rejects(fixture({operation, capabilities: without(capability)}).client.pending(context, signal()), /not negotiated/, capability);
  const card = async operation => { const [shown] = await fixture({operation}).client.pending(context, signal()); return `${shown.title}\n${shown.description}`; };
  assert.match(await card(number), /^Review SMS\nTo: \+14155550100\n\nRunning late/);
  const draft = await card({...number, target: {kind: 'contact', query: 'Priya'}, draft: true});
  assert.match(draft, /^Draft SMS\nTo contact: Priya\n\nRunning late/); assert.match(draft, /Nothing is sent until you tap Send/); assert.doesNotMatch(draft, /Android/);
  const change = await card(add);
  assert.match(change, /^Change contact\nContact: Priya\nAdd: \+14155550100\nRemove: p@example\.com\n/); assert.match(change, /other details stay/); assert.doesNotMatch(change, /Replaces/);
  assert.match(await card({type: 'contact_update', query: 'Priya', set: {displayName: 'Priya N'}}), /Name: Priya N\n\nReplaces these details/);
  assert.match(await card({type: 'contact_show', query: 'Priya'}), /^Show contact\nSearch: Priya/);
});
test('the view change that shows a draft or the matching contacts runs once, after the receipt, and only for a success', async () => {
  const draft = {type: 'sms_compose', target: {kind: 'number', number: '+14155550100'}, body: 'Running late', draft: true};
  for (const [operation, result] of [[draft, {kind: 'sms-compose', status: 'drafted'}], [{type: 'contact_show', query: 'Priya'}, {kind: 'contact-show', status: 'shown'}]]) {
    const shown = [], f = fixture({operation, result, present: posted => shown.push(posted)});
    await f.client.pending(context, signal());
    assert.equal((await f.client.approve(id, context, signal())).status, 'succeeded');
    assert.deepEqual(shown, [['decision', 'claim', 'receipt']], operation.type);
    assert.deepEqual(receiptOf(f).result, result);
  }
  const shown = [], f = fixture({operation: {type: 'contact_show', query: 'Nobody'}, result: {kind: 'contact-show', status: 'not-found'}, status: 'failed', present: posted => shown.push(posted)});
  await f.client.pending(context, signal()); await f.client.approve(id, context, signal());
  assert.deepEqual(shown, []); assert.equal(receiptOf(f).outcome, 'failed');
});
test('the open contact is returned to the agent as a read result, and a request from elsewhere is asked again from the contact', async () => {
  const result = {kind: 'contact-read', status: 'read', contact: {displayName: 'Priya Nair', phoneNumbers: ['(415) 555-0132'], emailAddresses: ['p@example.com']}};
  const contacts = {...context, view: 'contacts'};
  const f = fixture({operation: {type: 'contact_read_selected'}, result, requestMessageId: messageId});
  assert.deepEqual((await f.client.pendingReview(context, signal(), proof)).map(item => [item.proposal, item.notice]), [[null, 'Share open contact: Ask again from the open contact.']]);
  assert.ok((await f.client.pendingReview(contacts, signal(), proof))[0].proposal);
  assert.equal((await f.client.approve(id, contacts, signal())).status, 'succeeded');
  assert.equal(receiptOf(f).outcome, 'applied'); assert.deepEqual(receiptOf(f).result, result);
});
test('a latest SMS sender read from Home requires the negotiated capability and an approved exact receipt', async () => {
  const capability = 'sms.latest-sender.v1';
  const operation = {type: 'sms_latest_sender'};
  const result = {kind: 'sms-latest-sender', status: 'found', numberEnding: '0123'};
  const profile = {android: true, native: true, aospImage: true, foregroundReview: true};
  assert.ok(P.selectDeviceCapabilities([capability], profile).includes(capability));
  assert.ok(!P.selectDeviceCapabilities([capability], {...profile, aospImage: false}).includes(capability));
  await assert.rejects(fixture({operation, result, capabilities: []}).client.pending(context, signal()), /not negotiated/);
  const f = fixture({operation, result, capabilities: [capability], requestMessageId: messageId});
  const [card] = await f.client.pendingReview(context, signal(), proof);
  assert.ok(card.proposal);
  assert.equal(f.effects, 0);
  assert.equal((await f.client.approve(id, context, signal())).status, 'succeeded');
  assert.deepEqual(receiptOf(f).result, result);
  await f.client.approve(id, context, signal()).catch(() => {});
  assert.equal(f.effects, 1);
});

test('each action needs its own negotiated capability', async () => {
  await assert.rejects(fixture({capabilities: []}).client.pending(context, signal()), /not negotiated/);
  await assert.rejects(fixture({capabilities: ['contacts.write.v1']}).client.pending(context, signal()), /not negotiated/);
  const [card] = await fixture().client.pending(context, signal());
  assert.match(`${card.title} ${card.description}`, /Priya/);
  assert.doesNotMatch(`${card.title} ${card.description}`, /connected|answered/i);
});
test('a sensitive screen cannot review a call', async () => {
  assert.deepEqual(await fixture().client.pending({...context, sensitive: true}, signal()), []);
});
test('an approved call runs once and its receipt carries exactly what the phone observed', async () => {
  const f = fixture();
  await f.client.pending(context, signal());
  assert.equal((await f.client.approve(id, context, signal())).status, 'succeeded');
  const receipt = receiptOf(f);
  assert.equal(receipt.outcome, 'applied'); assert.deepEqual(receipt.result, {kind: 'phone-call', status: 'placed', contact: true});
  await f.client.approve(id, context, signal()).catch(() => {});
  assert.equal(f.effects, 1, 'a second approval never calls again');
});
test('a result that contradicts the operation is refused rather than receipted', async () => {
  const f = fixture({operation: {type: 'phone_call', target: {kind: 'number', number: '+15555550100'}}, result: {kind: 'phone-call', status: 'placed', contact: true}});
  await f.client.pending(context, signal());
  await f.client.approve(id, context, signal()).catch(() => {});
  assert.notEqual(receiptOf(f)?.outcome, 'applied', 'a number call cannot report a contact choice');
});
test('a stale contact change is a failed receipt and nothing is retried', async () => {
  const f = fixture({operation: {type: 'contact_update', query: 'Priya', set: {displayName: 'Priya N'}}, result: {kind: 'contact-write', status: 'stale'}, status: 'failed'});
  await f.client.pending(context, signal());
  assert.equal((await f.client.approve(id, context, signal())).status, 'failed');
  assert.equal(receiptOf(f).outcome, 'failed'); assert.equal(receiptOf(f).result.status, 'stale'); assert.equal(f.effects, 1);
});
test('a text to a contact is journalled under the proposal id, and an unknown outcome is never sent again', async () => {
  const operation = {type: 'sms_compose', query: 'Priya', body: 'On my way'};
  let f = fixture({operation, result: {kind: 'sms-compose', status: 'submitted'}});
  await f.client.pending(context, signal()); await f.client.approve(id, context, signal());
  assert.deepEqual(f.seen, [id], 'the native send runs under the proposal id'); assert.equal(receiptOf(f).operationId, id);
  f = fixture({operation, result: {kind: 'sms-compose', status: 'unknown'}, status: 'unknown'});
  await f.client.pending(context, signal());
  assert.equal((await f.client.approve(id, context, signal())).status, 'unknown');
  await f.client.approve(id, context, signal()).catch(() => {});
  await f.client.syncReceipts(signal()).catch(() => {});
  assert.equal(f.effects, 1, 'an unknown send is not repeated');
  assert.notEqual(receiptOf(f)?.outcome, 'applied');
});
test('a receipt retry replays the journalled result without calling again', async () => {
  const f = fixture({receiptOutage: true});
  await f.client.pending(context, signal()); await f.client.approve(id, context, signal());
  f.online(); await f.client.syncReceipts(signal());
  assert.equal(f.effects, 1);
  assert.deepEqual(f.posts.filter(post => post.path.endsWith('/receipt')).at(-1).body.receipt.result, {kind: 'phone-call', status: 'placed', contact: true});
});
test('the open thread is returned to the agent as a read result', async () => {
  const result = {kind: 'messages-read', status: 'read', participant: 'Priya Nair', messages: [{direction: 'in', date: 1, body: 'Are we still on for 7?'}], truncated: false};
  const f = fixture({operation: {type: 'messages_read_selected'}, result, requestMessageId: messageId});
  const messages = {...context, view: 'messages'};
  assert.ok((await f.client.pendingReview(messages, signal(), proof))[0].proposal);
  assert.equal((await f.client.pending(messages, signal())).length, 1, 'a refresh keeps the exact review available');
  assert.equal((await f.client.approve(id, messages, signal())).status, 'succeeded');
  assert.equal(receiptOf(f).outcome, 'applied'); assert.deepEqual(receiptOf(f).result, result);
});
test('recovery cannot attach a selected telephony proposal to another item or session', async () => {
  for (const [operation, view] of [
    [{type: 'messages_read_selected'}, 'messages'],
    [{type: 'sms_reply_selected', body: 'On my way'}, 'messages'],
    [{type: 'contact_read_selected'}, 'contacts'],
    [{type: 'voicemail_read_selected'}, 'phone'],
    [{type: 'voicemail_delete_selected'}, 'phone'],
  ]) {
    const original = {...context, view};
    const switched = {...original, revision: original.revision + 1};
    const f = fixture({operation, requestMessageId: messageId});
    assert.deepEqual(await f.client.pending(original, signal()), [], 'unseen proposals cannot be recovered');
    assert.equal((await f.client.pendingReview(original, signal(), {...proof, messageId: 'other-message'}))[0].proposal, null);
    assert.ok((await f.client.pendingReview(original, signal(), proof))[0].proposal);
    assert.deepEqual(await f.client.pending(switched, signal()), [], 'the same card cannot move to a different item');
    await assert.rejects(f.client.approve(id, switched, signal()), /Review this action again/);
    assert.equal(f.effects, 0);
    assert.deepEqual(await fixture({operation, requestMessageId: messageId}).client.pending(original, signal()), [], 'a replacement coordinator needs a fresh request');
  }
});
test('the dialer keypad is advertised only on the image, opens without a review only for a number the owner typed, and never calls', async () => {
  const profile = {android: true, native: true, aospImage: true};
  assert.ok(P.selectDeviceCapabilities(['phone.keypad.v1'], profile).includes('phone.keypad.v1'));
  assert.ok(!P.selectDeviceCapabilities(['phone.keypad.v1'], {...profile, aospImage: false}).includes('phone.keypad.v1'), 'a standalone install draws no keypad for the agent');
  assert.ok(!P.selectDeviceCapabilities([], profile).includes('phone.keypad.v1'), 'only what the agent offers');
  const keypad = {type: 'phone_keypad', number: '+14155550100'};
  await assert.rejects(fixture({operation: keypad}).client.pending(context, signal()), /not negotiated/);
  const [card] = await fixture({operation: keypad, capabilities: ['phone.keypad.v1']}).client.pending(context, signal());
  assert.match(`${card.title}\n${card.description}`, /^Open keypad\nNumber: \+14155550100\n\nOpens the Phone keypad with this number filled in\. Nothing is dialed until you tap Call\.$/);
  const shown = [], f = fixture({operation: keypad, capabilities: ['phone.keypad.v1'], result: {kind: 'phone-keypad', status: 'opened'}, requestMessageId: messageId, present: posted => shown.push(posted)});
  await f.client.pending(context, signal());
  assert.deepEqual(await f.client.performRequested('other', context, signal(), async () => true), []);
  assert.equal(f.effects, 0);
  // A number the owner did not type in this message (read from an email or a page) keeps its card.
  const proof = text => ({messageId, text, current() {}});
  for (const current of [undefined, proof('open the keypad with the number from that email'), proof('open the keypad with 415 555 0199')])
    assert.deepEqual(await f.client.performRequested(messageId, context, signal(), async () => true, undefined, current), []);
  assert.equal(f.effects, 0);
  assert.deepEqual((await f.client.performRequested(messageId, context, signal(), async () => true, undefined, proof('open the dialer with +1 415-555-0100'))).map(result => result.status), ['succeeded']);
  assert.equal(f.effects, 1); assert.deepEqual(shown, [['decision', 'claim', 'receipt']], 'the keypad comes in front after the receipt');
  assert.deepEqual(receiptOf(f).result, {kind: 'phone-keypad', status: 'opened'});
  // A call bound to the same message keeps its review.
  const call = fixture({operation: {type: 'phone_call', target: {kind: 'number', number: '+14155550100'}}, requestMessageId: messageId});
  await call.client.pending(context, signal());
  assert.deepEqual(await call.client.performRequested(messageId, context, signal(), async () => true), []);
  assert.equal(call.effects, 0);
});
