// Inbox delivery guards and bounded local work, with synthetic stores and a synthetic provider.
// No account, network, OAuth consent or mail.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {stripTypeScriptTypes} from './support/strip-types.mjs';
import {editCoalescer} from '../apps/app/src/runtime/inbox-edit-coalescer.ts';
import {encodeInboxUnsaved, readInboxUnsaved, inboxUnsavedLimit} from '../apps/app/src/runtime/inbox-unsaved-record.ts';
import {ServiceReadCache} from '../apps/app/src/runtime/service-read-cache.ts';
import * as grants from '../apps/app/src/runtime/gmail-grants.ts';

/** Bundles one source with named ports replaced; the last path segment selects the replacement. */
async function bundle(entry, mocks = {}) {
  const result = await build({entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent', plugins: [{name: 'ports', setup(b) {
    b.onResolve({filter: /.*/}, args => { const name = args.path.split('/').at(-1).replace(/\.ts$/, ''); if (name in mocks) return {path: name, namespace: 'fixture'}; });
    b.onLoad({filter: /.*/, namespace: 'fixture'}, args => ({contents: mocks[args.path], loader: 'js'}));
  }}]});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const attachmentPort = `export class AttachmentRefusedError extends Error{constructor(m='Attachment refused'){super(m);this.name='AttachmentRefusedError';}}
export const attachmentRefused=e=>e instanceof AttachmentRefusedError;export const reviewMailAttachment=async()=>{throw Error('Unexpected attachment read');};`;
const operations = await bundle('apps/app/src/runtime/inbox-operation.ts', {'inbox-attachment': attachmentPort});
const {InboxOperation, nextOperationPhase, reviewConfirmable, sameComposerContent, composerContent, reviewBinding, reviewOpaqueAttachment, grantRefusal} = operations;
const mailbox = await bundle('apps/app/src/runtime/gmail-mailbox.ts', {'inbox-attachment': attachmentPort});

const sha = async text => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), b => b.toString(16).padStart(2, '0')).join('');
const archive = {kind: 'archive', messageId: 'message-1', expectedHistoryId: 'history-1'};
function device() {
  const slots = new Map(), remote = {dispatches: 0, dispatchState: 'succeeded', answer: null, receipts: new Map()};
  const client = {
    gmailPrepareOperation: async (_grant, requestId, proposal) => {
      const review = {...proposal, from: 'owner@example.invalid', attachments: []};
      const receipt = {requestId, kind: proposal.kind, state: 'prepared', reviewDigest: await sha(JSON.stringify(review)), providerResult: null, rejectionCode: null};
      remote.receipts.set(requestId, receipt); return {review, receipt};
    },
    gmailDispatchOperation: async (_grant, requestId, reviewDigest, proposal) => {
      remote.dispatches++; if (remote.dispatchFails) throw new TypeError('Failed to fetch');
      const receipt = {requestId, kind: proposal.kind, state: remote.dispatchState, reviewDigest, providerResult: remote.dispatchState === 'succeeded' ? {messageId: proposal.messageId, historyId: 'history-2'} : null, rejectionCode: null};
      remote.receipts.set(requestId, receipt); return receipt;
    },
    gmailOperation: async (_grant, requestId) => ({...remote.receipts.get(requestId), ...(remote.answer ? {state: remote.answer, providerResult: null} : {})}),
  };
  const store = {
    read: async key => structuredClone(slots.get(key) ?? null),
    compareExchange: async (key, prior, next) => {
      if (JSON.stringify(slots.get(key) ?? null) !== JSON.stringify(prior)) return {status: 'conflict'};
      if (next === null) slots.delete(key); else slots.set(key, structuredClone(next)); return {status: 'saved'};
    },
  };
  const make = (extra = {}) => new InboxOperation({owner: 'owner', grantId: 'grant-a', active: () => true, store, client, ...extra});
  return {slots, remote, client, store, make, slot: () => [...slots.values()][0] ?? null};
}

test('a prepared answer never returns a dispatched or observed operation to a confirmable phase', () => {
  for (const reviewed of [true, false]) {
    assert.equal(nextOperationPhase('dispatching', 'prepared', reviewed), 'dispatching');
    assert.equal(nextOperationPhase('observed', 'prepared', reviewed), 'observed');
  }
  assert.equal(nextOperationPhase('review', 'prepared', true), 'review');
  assert.equal(nextOperationPhase('preparing', 'prepared', true), 'review');
  assert.equal(nextOperationPhase('preparing', 'prepared', false), 'preparing');
  for (const phase of ['preparing', 'review', 'dispatching', 'observed']) for (const state of ['dispatched', 'succeeded', 'rejected', 'outcome-unknown']) assert.equal(nextOperationPhase(phase, state, true), 'observed');
});

for (const outcome of ['outcome-unknown', 'dispatched', 'succeeded']) {
  test(`a regressed provider answer after a ${outcome} dispatch cannot re-arm Confirm`, async () => {
    const d = device(), operation = d.make();
    await operation.prepare(archive); d.remote.dispatchState = outcome;
    await operation.confirm();
    assert.equal(operation.snapshot().phase, 'observed'); assert.equal(d.remote.dispatches, 1);
    // The provider now reports the request as merely prepared.
    d.remote.answer = 'prepared';
    const after = await operation.refresh();
    assert.equal(after.phase, 'observed', 'an observed operation stays observed');
    assert.equal(after.receipt.state, outcome, 'the saved receipt is not replaced by the regressed answer');
    assert.equal(d.slot().phase, 'observed');
    assert.equal(reviewConfirmable(after, 'none', true), false);
    await assert.rejects(operation.confirm(), /fresh exact review/);
    assert.equal(d.remote.dispatches, 1, 'the same request is never dispatched twice');
    // A reload sees the same durable state.
    const reloaded = d.make(); await reloaded.load();
    await assert.rejects(reloaded.confirm(), /fresh exact review/);
    assert.equal(d.remote.dispatches, 1);
  });
}

test('a dispatch whose reply was lost stays dispatching on a prepared answer', async () => {
  const d = device(), operation = d.make();
  await operation.prepare(archive); d.remote.dispatchFails = true;
  await assert.rejects(operation.confirm(), /Failed to fetch/);
  assert.equal(d.slot().phase, 'dispatching');
  assert.equal((await operation.refresh()).phase, 'dispatching');
  await assert.rejects(operation.confirm(), /fresh exact review/);
  assert.equal(d.remote.dispatches, 1);
});

test('confirm refuses a review whose grant no longer allows the change, before any write or dispatch', async () => {
  const d = device(); let allowed = true;
  const operation = d.make({allows: kind => { assert.equal(kind, 'archive'); return allowed; }});
  await operation.prepare(archive); allowed = false;
  await assert.rejects(operation.confirm(), error => error.message === grantRefusal);
  assert.equal(d.remote.dispatches, 0); assert.equal(d.slot().phase, 'review', 'the review is not marked dispatching');
  allowed = true; await operation.confirm();
  assert.equal(d.remote.dispatches, 1);
});

test('Confirm is offered only for a bound, undispatched review under a grant that allows it', () => {
  const review = {phase: 'review', receipt: {state: 'prepared'}};
  assert.equal(reviewConfirmable(review, 'bound', true), true);
  assert.equal(reviewConfirmable(review, 'none', true), true);
  assert.equal(reviewConfirmable(review, 'bound', false), false, 'a withdrawn grant');
  for (const binding of ['edited', 'other', 'absent']) assert.equal(reviewConfirmable(review, binding, true), false);
  for (const phase of ['preparing', 'dispatching', 'observed']) assert.equal(reviewConfirmable({...review, phase}, 'bound', true), false);
  assert.equal(reviewConfirmable({phase: 'review', receipt: {state: 'succeeded'}}, 'bound', true), false);
  assert.equal(reviewConfirmable(null, 'none', true), false);
  assert.equal(InboxOperation.confirmable, reviewConfirmable);
});

test('the review sheet does not offer or dispatch a saved review after a restart under a withdrawn grant', async () => {
  const d = device(), first = d.make(); await first.prepare(archive);
  assert.equal(d.slot().phase, 'review');
  // A new process: no earlier account read exists to report the withdrawal; only capabilities do.
  let source = await readFile(new URL('../apps/app/src/prototype/inbox-provider-controls.ts', import.meta.url), 'utf8');
  source = '{' + stripTypeScriptTypes(source.replace(/^import .*;\n/gm, '').replace(/^export (?=function )/gm, '') + '\nglobalThis.inboxProviderControls=inboxProviderControls;') + '}';
  const toasts = [], caps = {send: true, providerDrafts: true, mailboxMutations: false, threads: true, from: 'owner@example.invalid'};
  const client = {...d.client, gmailInboxCapabilities: async () => ({...caps})};
  const sandbox = {InboxOperation, composerKind: operations.composerKind, composerContent, reviewBinding, reviewBindingRefusal: operations.reviewBindingRefusal, classifyGmailFailure: mailbox.classifyGmailFailure, ...grants, performance, queueMicrotask, crypto: globalThis.crypto, TextEncoder, structuredClone,
    inboxLocalStore: d.store, connectionController: {getCloudClient: () => ({client, sessionId: 'session-1'}), getSnapshot: () => ({cloudAccount: {environment: 'production', userId: 'owner-1'}})}, AbortController, DOMException, Error, console, document: {documentElement: {dataset: {connectionMode: 'live'}}}};
  // The saved record must belong to the owner the controls derive.
  const owner = JSON.stringify(['production', 'owner-1', '']), key = `inbox-operation:v1:${await sha(JSON.stringify([owner, 'grant-a']))}`;
  d.slots.clear(); d.slots.set(key, {...(await (async () => { const o = new InboxOperation({owner, grantId: 'grant-a', active: () => true, store: d.store, client: d.client}); await o.prepare(archive); return d.slots.get(key); })())});
  vm.createContext(sandbox); vm.runInContext(source, sandbox);
  const provider = sandbox.inboxProviderControls(() => {}, text => toasts.push(text));
  await provider.bind('grant-a');
  const shown = provider.render().provider;
  assert.equal(d.slots.get(key).phase, 'review');
  assert.equal(shown.canConfirm, false, 'Confirm is not offered');
  assert.equal(shown.status, grantRefusal);
  shown.confirm();
  for (let turn = 0; turn < 50 && !toasts.length; turn++) await new Promise(resolve => setTimeout(resolve, 2));
  assert.equal(d.remote.dispatches, 0, 'nothing is dispatched');
  assert.equal(d.slots.get(key).phase, 'review');
  assert.deepEqual(toasts, [grantRefusal]);
  // With the capability restored the same review can be confirmed.
  caps.mailboxMutations = true; await provider.bind('grant-a');
  assert.equal(provider.render().provider.canConfirm, true);
});

test('snapshot copies a record once per change, not once per read', async () => {
  const d = device(), operation = d.make();
  assert.equal(operation.snapshot(), null);
  await operation.prepare({...archive});
  const first = operation.snapshot();
  assert.equal(operation.snapshot(), first, 'the same object while the record is unchanged');
  assert.ok(Object.isFrozen(first) && Object.isFrozen(first.proposal) && Object.isFrozen(first.receipt), 'shared snapshots are read-only');
  assert.throws(() => { 'use strict'; first.phase = 'observed'; });
  await operation.confirm();
  const second = operation.snapshot();
  assert.notEqual(second, first); assert.equal(second.phase, 'observed'); assert.equal(first.phase, 'review');
  await operation.clear(); assert.equal(operation.snapshot(), null);
});

test('composer content comparison agrees with the comparable text without building it', () => {
  const file = {name: 'a.txt', mimeType: 'text/plain', dataBase64: 'QUJD'};
  const base = {kind: 'send', mode: 'compose', to: ['a@example.invalid'], cc: [], bcc: [], subject: 'S', bodyText: 'B', attachments: [file]};
  const variants = [
    base, {...base}, {...base, kind: 'draft-create'}, {...base, cc: undefined}, {...base, cc: null}, {...base, to: ['b@example.invalid']}, {...base, to: []}, {...base, subject: 's'}, {...base, bodyText: ''},
    {...base, attachments: []}, {...base, attachments: [{...file}]}, {...base, attachments: [{...file, dataBase64: 'QUJE'}]}, {...base, attachments: [file, file]}, {...base, attachments: [{name: 'a.txt', mimeType: 'text/plain', dataBase64: 'QUJD', extra: undefined}]},
    {...base, replyMessageId: 'm1'}, {...base, replyMessageId: undefined}, {...base, forwardAttachments: {messageId: 'm', historyId: 'h', partIds: ['1']}}, {...base, forwardAttachments: {messageId: 'm', historyId: 'h', partIds: ['2']}}, {...base, mode: 'reply'}, {mode: 'compose'}, {},
  ];
  for (const a of variants) for (const b of variants) assert.equal(sameComposerContent(a, b), composerContent(a) === composerContent(b), `${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
  const stringify = JSON.stringify; let texts = 0;
  JSON.stringify = (...args) => { texts++; return stringify(...args); };
  try { assert.equal(reviewBinding({proposal: base, composer: {draftId: 'd'}}, {draftId: 'd', proposal: {...base, attachments: [{...file}]}}), 'bound'); }
  finally { JSON.stringify = stringify; }
  assert.equal(texts, 0, 'a render-time binding check serialises nothing');
  assert.equal(reviewBinding({proposal: base, composer: {draftId: 'd'}}, {draftId: 'd', proposal: {...base, bodyText: 'changed'}}), 'edited');
});

test('a wrongly encoded attachment is not reported as too large', async () => {
  // 'QQ' decodes, but its canonical form is 'QQ=='.
  await assert.rejects(reviewOpaqueAttachment({name: 'a.bin', mimeType: 'application/octet-stream', dataBase64: 'QQ'}), error => error.name === 'AttachmentRefusedError' && /encoding/.test(error.message) && !/MiB/.test(error.message));
  const large = Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64');
  await assert.rejects(reviewOpaqueAttachment({name: 'a.bin', mimeType: 'application/octet-stream', dataBase64: large}), /exceeds 5 MiB/);
  assert.equal((await reviewOpaqueAttachment({name: 'a.bin', mimeType: 'application/octet-stream', dataBase64: 'QQ=='})).size, 1);
});

function clock() {
  let now = 0, next = 1; const timers = new Map();
  return {timers: {set(run, ms) { const id = next++; timers.set(id, {run, at: now + ms}); return id; }, clear(id) { timers.delete(id); }, now: () => now},
    advance(ms) { const end = now + ms; for (;;) { const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0]; if (!due) break; now = due[1].at; timers.delete(due[0]); due[1].run(); } now = end; },
    count: () => timers.size};
}
test('a burst of edits is written once, with the latest value', () => {
  const c = clock(), written = [], queue = editCoalescer(value => written.push(value), {delay: 300, maximumWait: 1500, timers: c.timers});
  for (let i = 0; i < 20; i++) { queue.push('text-' + i); c.advance(50); }
  assert.deepEqual(written, [], 'nothing is written while typing continues');
  assert.equal(c.count(), 1, 'one timer, never one per keystroke'); assert.equal(queue.peek(), 'text-19'); assert.equal(queue.pending, true);
  c.advance(300);
  assert.deepEqual(written, ['text-19']); assert.equal(queue.pending, false); assert.equal(c.count(), 0);
  c.advance(5000); assert.equal(written.length, 1, 'no write is scheduled while idle');
});
test('continuous typing is still written within the maximum wait', () => {
  const c = clock(), written = [], queue = editCoalescer(value => written.push(value), {delay: 300, maximumWait: 1500, timers: c.timers});
  for (let i = 0; i < 100; i++) { queue.push(i); c.advance(100); }
  assert.ok(written.length >= 6 && written.length <= 7, `one write per maximum wait, got ${written.length}`);
  assert.deepEqual(written.slice(0, 2), [14, 29]);
});
test('flush writes at once, and a busy writer holds the next write without queueing more than one value', () => {
  const c = clock(), written = [], queue = editCoalescer(value => written.push(value), {delay: 300, maximumWait: 1500, timers: c.timers});
  queue.push('a'); assert.equal(queue.flush(), true); assert.deepEqual(written, ['a']); assert.equal(queue.flush(), false);
  queue.hold(); queue.push('b'); c.advance(1000); queue.push('c'); c.advance(1000);
  assert.deepEqual(written, ['a'], 'held: the due write waits'); assert.equal(queue.peek(), 'c');
  queue.release(); assert.deepEqual(written, ['a', 'c'], 'released: only the latest value is written');
  queue.hold(); queue.push('d'); assert.equal(queue.flush(), true, 'an explicit flush writes even while held'); queue.release();
  queue.push('e'); queue.discard(); c.advance(5000); assert.deepEqual(written, ['a', 'c', 'd']);
});

const owner = JSON.stringify(['production', 'owner', 'organization', 'grant-a']);
const draft = extra => ({version: 1, id: 'draft-1', revision: 'r1', owner, to: ['a@example.invalid'], cc: [], bcc: [], subject: 'S', body: 'B', mode: 'compose', ...extra});
test('a recovery copy is serialised once and never parsed back', () => {
  const value = {version: 1, owner, baseRevision: null, draft: draft({attachments: [{name: 'a.txt', mimeType: 'text/plain', dataBase64: 'QUJD'}]}), toQ: 'partial@'};
  const parse = JSON.parse, stringify = JSON.stringify; let parses = 0, texts = 0;
  JSON.parse = (...args) => { parses++; return parse(...args); }; JSON.stringify = (...args) => { texts++; return stringify(...args); };
  let raw; try { raw = encodeInboxUnsaved(value); } finally { JSON.parse = parse; JSON.stringify = stringify; }
  assert.equal(parses, 0); assert.equal(texts, 1);
  assert.deepEqual(readInboxUnsaved(raw, owner), value, 'what was checked is what is read back');
});
test('the recovery record refuses what it does not admit, and reports only size as too large', () => {
  const wrap = d => ({version: 1, owner, baseRevision: null, draft: d, toQ: ''});
  assert.throws(() => encodeInboxUnsaved(wrap(draft({earlierThanSent: true}))), error => !(error instanceof RangeError));
  assert.throws(() => encodeInboxUnsaved(wrap(draft({forward: {messageId: 'm', historyId: 'h', parts: []}}))), error => !(error instanceof RangeError));
  assert.throws(() => encodeInboxUnsaved(wrap(draft({owner: 'someone-else'}))), /need recovery/);
  assert.doesNotThrow(() => encodeInboxUnsaved(wrap(draft({earlierThanSent: undefined, reply: undefined}))), 'an undefined key is absent from the stored text');
  const big = Array.from({length: 2}, (_, i) => ({name: `f${i}`, mimeType: 'text/plain', dataBase64: 'A'.repeat(inboxUnsavedLimit / 2)}));
  assert.throws(() => encodeInboxUnsaved(wrap(draft({attachments: big}))), RangeError);
  assert.throws(() => readInboxUnsaved('x'.repeat(inboxUnsavedLimit + 1), owner), /need recovery/);
});

test('Calendar and Inbox keep separate offline documents for one account', async () => {
  const slots = new Map(); globalThis.readCacheSlots = slots;
  const {serviceReadCache, readCacheIdentity, sharedReadCacheIdentity} = await bundle('apps/app/src/runtime/service-read-cache-store.ts', {
    core: `export const Capacitor={isNativePlatform:()=>true};`,
    'native-connection': `const s=()=>globalThis.readCacheSlots;export const secureConnectionStore={read:async slot=>structuredClone(s().get(slot)??null),compareExchange:async(slot,before,value)=>{if(JSON.stringify(s().get(slot)??null)!==JSON.stringify(before))return {status:'conflict'};if(value===null)s().delete(slot);else s().set(slot,structuredClone(value));return {status:'saved'};}};`,
    'json-domain-document': `export class BrowserJsonDomainDocument{}`,
  });
  try {
    const account = {environment: 'production', userId: 'user', organizationId: 'org', credentialId: 'credential'};
    assert.notEqual(readCacheIdentity(account, 'gmail'), readCacheIdentity(account, 'google-calendar'));
    // The document both services used to share is removed, not read.
    const shared = 'connected-read-cache:v1:' + await sha(sharedReadCacheIdentity(account));
    slots.set(shared, {version: 1, owner: sharedReadCacheIdentity(account), entries: [{key: 'gmail:mailbox', value: 'old mail', at: Date.now()}]});
    const mail = await serviceReadCache(account, 'gmail'), calendar = await serviceReadCache(account, 'google-calendar');
    assert.notEqual(mail, calendar); assert.equal(await serviceReadCache(account, 'gmail'), mail, 'one handle per account and service');
    await mail.put('gmail:mailbox', {messages: ['saved mail']}); await calendar.put('["google-calendars","range"]', {events: ['saved event']});
    for (let turn = 0; turn < 50 && slots.has(shared); turn++) await new Promise(resolve => setTimeout(resolve, 2));
    assert.equal(slots.has(shared), false, 'the shared document is retired');
    assert.equal(slots.size, 2); for (const slot of slots.keys()) assert.match(slot, /^connected-read-cache:v1:[a-f0-9]{64}$/);
    // Calendar loses its grant and clears its cache: saved mail stays, and an Inbox write in flight lands.
    const pending = mail.put('gmail:preview', 'in flight'); await calendar.clear(); await pending;
    assert.deepEqual((await mail.get('gmail:mailbox')).value, {messages: ['saved mail']});
    assert.equal((await mail.get('gmail:preview')).value, 'in flight');
    assert.equal(await calendar.get('["google-calendars","range"]'), null);
    // And the reverse.
    await calendar.put('["google-calendars","range"]', {events: ['again']}); await mail.clear();
    assert.equal(await mail.get('gmail:mailbox'), null);
    assert.deepEqual((await calendar.get('["google-calendars","range"]')).value, {events: ['again']});
    await assert.rejects(serviceReadCache(account, 'other'), /unavailable/);
    await assert.rejects(serviceReadCache({...account, credentialId: ''}, 'gmail'), /unavailable/);
  } finally { delete globalThis.readCacheSlots; }
});

test('cache eviction measures each entry once instead of encoding the document per evicted entry', async () => {
  let raw = null, encodes = 0;
  const store = {read: async () => raw, compareExchange: async (before, value) => { if (before !== raw) return 'conflict'; raw = value; return 'saved'; }};
  const cache = new ServiceReadCache('owner', store, () => 10_000_000_000);
  // The newest entry counts how often it is serialised.
  const counted = {toJSON() { encodes++; return 'counted'; }};
  const block = 'x'.repeat(400 * 1024);
  for (let i = 0; i < 9; i++) await cache.put('page-' + i, block, 9_000_000_000 + i);
  await cache.put('counted', counted, 9_500_000_000);
  encodes = 0;
  // 1.9 MiB more: several of the oldest pages must go.
  await cache.put('large', 'y'.repeat(1900 * 1024), 9_900_000_000);
  const keys = raw.entries.map(entry => entry.key);
  assert.ok(new TextEncoder().encode(JSON.stringify(raw)).length <= 4 * 1024 * 1024);
  assert.ok(keys.includes('large') && keys.includes('counted'));
  const evicted = 9 - keys.filter(key => key.startsWith('page-')).length;
  assert.ok(evicted >= 3, `expected several evictions, got ${evicted}`);
  assert.deepEqual(keys.filter(key => key.startsWith('page-')), Array.from({length: 9 - evicted}, (_, i) => 'page-' + (i + evicted)), 'the oldest entries are the ones evicted');
  // One read-side size check and one measurement; the final assert above added one more.
  assert.ok(encodes <= 3, `an entry was serialised ${encodes} times for ${evicted} evictions`);
  // The bound is exact: one more byte than fits evicts, a document that fits keeps everything.
  raw = null; const exact = new ServiceReadCache('owner', store, () => 10_000_000_000);
  const overhead = new TextEncoder().encode(JSON.stringify({version: 1, owner: 'owner', entries: [{key: 'a', value: '', at: 9_999_999_001}, {key: 'b', value: '', at: 9_999_999_002}]})).length;
  const half = Math.floor((4 * 1024 * 1024 - overhead) / 2);
  await exact.put('a', 'x'.repeat(half), 9_999_999_001); await exact.put('b', 'x'.repeat(4 * 1024 * 1024 - overhead - half), 9_999_999_002);
  assert.equal(raw.entries.length, 2); assert.equal(new TextEncoder().encode(JSON.stringify(raw)).length, 4 * 1024 * 1024);
  await exact.put('b', 'x'.repeat(4 * 1024 * 1024 - overhead - half + 1), 9_999_999_003);
  assert.deepEqual(raw.entries.map(entry => entry.key), ['b']);
});

test('cached message bodies are measured once and bounded by count and bytes', () => {
  const {cachedJsonBytes, trimMailBodies, newestMailBodies} = mailbox;
  let encodes = 0; const body = (id, size) => ({id, text: 'x'.repeat(size), toJSON() { encodes++; return {id, text: this.text}; }});
  const first = body('a', 10);
  const bytes = cachedJsonBytes(first); assert.equal(bytes, new TextEncoder().encode(JSON.stringify({id: 'a', text: 'x'.repeat(10)})).length);
  encodes = 0; assert.equal(cachedJsonBytes(first), bytes); assert.equal(encodes, 0, 'a second measurement does not serialise');
  const rows = new Map(); encodes = 0;
  for (let i = 0; i < 40; i++) { rows.set('m' + i, {at: i, body: body('m' + i, 1000)}); trimMailBodies(rows, 16, 4 * 1024 * 1024); }
  assert.equal(encodes, 40, 'each body is serialised once across all inserts');
  assert.deepEqual([...rows.keys()], Array.from({length: 16}, (_, i) => 'm' + (i + 24)), 'the oldest rows are evicted');
  rows.set('big', {at: 99, body: body('big', 3000)}); trimMailBodies(rows, 16, 5000);
  assert.deepEqual([...rows.keys()], ['m39', 'big'], 'the byte bound evicts oldest first');
  rows.clear(); rows.set('huge', {at: 1, body: body('huge', 9000)}); trimMailBodies(rows, 16, 5000); assert.equal(rows.size, 0);
  const list = ['a', 'b', 'c', 'd'].map(id => ({at: 1, body: body(id, 1000)})), one = cachedJsonBytes(list[0].body);
  assert.deepEqual(newestMailBodies(list, one * 2).map(row => row.body.id), ['c', 'd'], 'the newest bodies that fit, in order');
  assert.deepEqual(newestMailBodies(list, one * 2 - 1).map(row => row.body.id), ['d']);
  assert.deepEqual(newestMailBodies(list, 0), []); assert.equal(newestMailBodies(list, one * 9).length, 4);
});
