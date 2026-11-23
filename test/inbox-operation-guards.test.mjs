// Inbox delivery guards and bounded local work, with synthetic stores and a synthetic provider.
// No account, network, OAuth consent or mail.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {build} from 'esbuild';
import {agentEmailSend} from '../apps/app/src/ui/mailbox/agent-email-draft.ts';
import {editCoalescer} from '../apps/app/src/runtime/inbox-edit-coalescer.ts';
import {ServiceReadCache} from '../apps/app/src/runtime/service-read-cache.ts';

/** Bundles one source with named ports replaced; the last path segment selects the replacement,
 * given as JavaScript text or as an esbuild load result ({contents, loader, resolveDir}). */
async function bundle(entry, mocks = {}) {
  const result = await build({entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent', plugins: [{name: 'ports', setup(b) {
    b.onResolve({filter: /.*/}, args => { const name = args.path.split('/').at(-1).replace(/\.ts$/, ''); if (name in mocks) return {path: name, namespace: 'fixture'}; });
    b.onLoad({filter: /.*/, namespace: 'fixture'}, args => typeof mocks[args.path] === 'string' ? {contents: mocks[args.path], loader: 'js'} : mocks[args.path]);
  }}]});
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const attachmentPort = `export class AttachmentRefusedError extends Error{constructor(m='Attachment refused'){super(m);this.name='AttachmentRefusedError';}}
export const attachmentRefused=e=>e instanceof AttachmentRefusedError;export const reviewMailAttachment=async()=>{throw Error('Unexpected attachment read');};`;
const {InboxOperation, receiptReadGuard, regressedReceipt, regressedReceiptRefusal} = await bundle('apps/app/src/runtime/inbox-operation.ts', {'inbox-attachment': attachmentPort});
const mailbox = await bundle('apps/app/src/runtime/gmail-mailbox.ts', {'inbox-attachment': attachmentPort});

const sha = async text => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), b => b.toString(16).padStart(2, '0')).join('');
const until = async (ready, what) => { const deadline = performance.now() + 5000; while (!ready()) { assert.ok(performance.now() < deadline, 'Timed out waiting for ' + what); await new Promise(resolve => setTimeout(resolve, 2)); } };
const archive = {kind: 'archive', messageId: 'message-1', expectedHistoryId: 'history-1'};
function device(owner = 'owner') {
  const slots = new Map(), remote = {dispatches: 0, dispatchState: 'succeeded', answer: null, receipts: new Map(), caps: {send: true, providerDrafts: true, mailboxMutations: true, threads: true, from: 'owner@example.invalid'}};
  const client = {
    gmailInboxCapabilities: async () => ({...remote.caps}),
    gmailDraft: async () => { throw Error('Unexpected draft read'); },
    gmailPrepareOperation: async (_grant, requestId, proposal) => {
      const review = {...proposal, from: 'owner@example.invalid', attachments: []};
      const receipt = {requestId, kind: proposal.kind, state: 'prepared', reviewDigest: await sha(JSON.stringify(review)), providerResult: null, rejectionCode: null};
      remote.receipts.set(requestId, receipt); return {review, receipt};
    },
    gmailDispatchOperation: async (_grant, requestId, reviewDigest, proposal) => {
      remote.dispatches++; if (remote.dispatchFails) throw new TypeError('Failed to fetch');
      const providerResult = proposal.kind === 'send'
        ? {messageId: 'sent-' + requestId, threadId: 'thread-1'}
        : {messageId: proposal.messageId, historyId: 'history-2'};
      const receipt = {requestId, kind: proposal.kind, state: remote.dispatchState, reviewDigest, providerResult: remote.dispatchState === 'succeeded' ? providerResult : null, rejectionCode: null};
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
  // The journal as the app binds it: receipt reads pass through the saved-outcome guard.
  const guarded = {...client, gmailOperation: InboxOperation.receiptReads(client.gmailOperation, store, owner)};
  const make = () => new InboxOperation({owner, grantId: 'grant-a', active: () => true, store, client: guarded});
  return {slots, remote, client, store, make, slot: () => [...slots.values()][0] ?? null};
}

test('only a prepared answer for the request whose outcome is saved counts as regressed', () => {
  const saved = {requestId: 'r1', phase: 'observed'};
  assert.equal(regressedReceipt(saved, 'r1', 'prepared'), true);
  for (const state of ['dispatched', 'succeeded', 'rejected', 'outcome-unknown']) assert.equal(regressedReceipt(saved, 'r1', state), false);
  for (const phase of ['preparing', 'review', 'dispatching']) assert.equal(regressedReceipt({requestId: 'r1', phase}, 'r1', 'prepared'), false, phase + ' is handled by the journal');
  assert.equal(regressedReceipt(saved, 'r2', 'prepared'), false, 'another request');
  assert.equal(regressedReceipt(null, 'r1', 'prepared'), false);
  assert.equal(InboxOperation.receiptReads.length, receiptReadGuard.length);
});

for (const outcome of ['outcome-unknown', 'dispatched', 'succeeded']) {
  test(`a regressed provider answer after a ${outcome} dispatch cannot re-arm Confirm`, async () => {
    const d = device(), operation = d.make();
    await operation.prepare(archive); d.remote.dispatchState = outcome;
    await operation.confirm();
    assert.equal(operation.snapshot().phase, 'observed'); assert.equal(d.remote.dispatches, 1);
    const receipt = structuredClone(d.slot().receipt);
    // The provider now reports the request as merely prepared.
    d.remote.answer = 'prepared';
    await assert.rejects(operation.refresh(), error => error.message === regressedReceiptRefusal);
    assert.equal(operation.snapshot().phase, 'observed', 'an observed operation stays observed');
    assert.deepEqual(d.slot().receipt, receipt, 'the saved receipt is not replaced by the regressed answer');
    assert.equal(d.slot().phase, 'observed');
    await assert.rejects(operation.confirm(), /fresh exact review/);
    assert.equal(d.remote.dispatches, 1, 'the same request is never dispatched twice');
    // A reload sees the same durable state, and the regressed answer still cannot change it.
    const reloaded = d.make(); await reloaded.load();
    await assert.rejects(reloaded.refresh(), error => error.message === regressedReceiptRefusal);
    await assert.rejects(reloaded.confirm(), /fresh exact review/);
    assert.equal(d.remote.dispatches, 1); assert.equal(d.slot().phase, 'observed');
    // An honest answer is still recorded.
    d.remote.answer = null; d.remote.receipts.set(receipt.requestId, {...receipt, state: 'succeeded', providerResult: {messageId: 'message-1', historyId: 'history-2'}});
    assert.equal((await reloaded.refresh()).receipt.state, 'succeeded');
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

test('an unsent review is still refreshed and confirmed through the guarded read', async () => {
  const d = device(), operation = d.make();
  await operation.prepare(archive);
  assert.equal((await operation.refresh()).phase, 'review');
  assert.equal((await operation.confirm()).phase, 'observed'); assert.equal(d.remote.dispatches, 1);
});

// The real controls over the fixture of the running test; the ports read it on every call.
const controlPorts = {
  'inbox-local-store': `const f=()=>globalThis.inboxControlsFixture.store;export const inboxLocalStore={read:key=>f().read(key),compareExchange:(key,before,next)=>f().compareExchange(key,before,next)};`,
  'connection-ui': `const f=()=>globalThis.inboxControlsFixture.controller;export const connectionController={getCloudClient:()=>f().getCloudClient(),getSnapshot:()=>f().getSnapshot()};`,
  'inbox-attachment': attachmentPort,
};
let controlsModule;
const controls = () => controlsModule ??= bundle('apps/app/src/prototype/inbox-provider-controls.ts', controlPorts);

// The shared journal the controls run on. `pinned` is the journal as pinned, whose prepare keeps a
// requested ID first (elizaOS/eliza#39921), as a chat draft's Send needs; `names` records a fresh
// UUID of its own instead, as an earlier journal did, and review-controller.ts refuses that Send.
const journalDirectory = resolve('.eliza/client-features/plugins/plugin-inbox/src/mailbox');
function journalVariant(name) {
  const source = readFileSync(join(journalDirectory, 'operation-journal.ts'), 'utf8');
  const start = source.indexOf('\n  async prepare('), end = source.indexOf('\n  async reloadReview(', start);
  const prepare = start < 0 || end < 0 ? '' : source.slice(start, end), line = /^([ \t]*)requestId: (.+),$/gm;
  const recorded = [...prepare.matchAll(line)];
  assert.equal(recorded.length, 1, 'The journal prepare records one request ID');
  assert.equal(recorded[0][2], 'source?.requestId ?? crypto.randomUUID()', 'The pinned journal prepare keeps a requested ID');
  const contents = name === 'pinned' ? source : source.slice(0, start) + prepare.replace(line, '$1requestId: crypto.randomUUID(),') + source.slice(end);
  return {contents, loader: 'ts', resolveDir: journalDirectory};
}
const variantControls = new Map();
const controlsWith = name => {
  if (!variantControls.has(name)) variantControls.set(name, bundle('apps/app/src/prototype/inbox-provider-controls.ts', {...controlPorts, 'operation-journal': journalVariant(name)}));
  return variantControls.get(name);
};

/**
 * A chat draft's one-tap Send, bound as inbox-cloud-adapter.ts binds it: while it runs the
 * composer is the chat email, prepared under the request ID its turn and content name. Cloud
 * binds a request ID to the first operation prepared under it and refuses it for any other; a
 * positive `d.lose` drops that many answers to prepares Cloud made, so nothing is dispatched.
 */
const chatTurn = 'fda73825-d24c-4bf8-b188-52287e34c4c4', chatSender = {grant: 'grant-a', from: 'owner@example.invalid'};
const crewEmail = body => agentEmailSend(chatTurn, chatSender, {to: ['crew@example.invalid'], subject: 'Shoot plan', body});
async function withChatSend(journal, run) {
  const account = {environment: 'production', userId: 'owner-1'};
  const d = device(JSON.stringify(['production', 'owner-1', ''])), prepared = [], dispatched = [], bound = new Map();
  const {gmailPrepareOperation: prepare, gmailDispatchOperation: dispatch} = d.client;
  d.lose = 0;
  d.client.gmailPrepareOperation = async (grant, requestId, proposal, signal) => {
    prepared.push(requestId);
    const content = JSON.stringify(proposal);
    if ((bound.get(requestId) ?? content) !== content) throw Error('Request ID is already bound to a different reviewed operation');
    bound.set(requestId, content);
    const answer = await prepare(grant, requestId, proposal, signal);
    if (d.lose > 0) { d.lose--; throw new TypeError('Failed to fetch'); }
    return answer;
  };
  d.client.gmailDispatchOperation = async (grant, requestId, digest, proposal, signal) => {
    dispatched.push([requestId, proposal.bodyText]);
    return dispatch(grant, requestId, digest, proposal, signal);
  };
  globalThis.inboxControlsFixture = {store: d.store, controller: {getCloudClient: () => ({client: d.client, sessionId: 'session-1'}), getSnapshot: () => ({cloudAccount: account})}};
  globalThis.document = {documentElement: {dataset: {connectionMode: 'live'}}};
  try {
    const {inboxProviderControls} = await controlsWith(journal);
    const provider = inboxProviderControls(() => {}, () => {});
    let email;
    provider.setComposer(() => email ? {draftId: email.draftId, proposal: email.proposal} : null);
    const send = async body => {
      email = crewEmail(body);
      try {
        return await provider.prepare({kind: 'send', ...email.proposal}, {draftId: email.draftId, requestId: email.requestId}, 'send-from-composer');
      } finally { email = undefined; }
    };
    await run({d, provider, send, prepared, dispatched});
  } finally {
    delete globalThis.inboxControlsFixture;
    delete globalThis.document;
  }
}

test('a chat draft Send is refused, and nothing is dispatched, while the journal names its own request ID', async () => {
  await withChatSend('names', async ({d, provider, send, prepared, dispatched}) => {
    await provider.bind('grant-a');
    assert.deepEqual(await send('Pack the tripod.'), {state: 'unsent', detail: 'Update Alpha before sending this email.'});
    assert.equal(prepared.length, 1);
    assert.notEqual(prepared[0], crewEmail('Pack the tripod.').requestId);
    assert.deepEqual(dispatched, []);
    assert.equal(d.slot(), null, 'the refused review is not kept');
  });
});

for (const journal of ['names', 'pinned'])
  test(`a chat draft Send prepares again over its unsent review saved under another request ID (${journal === 'pinned' ? 'pinned journal' : 'journal naming its own IDs'})`, async () => {
    await withChatSend(journal, async ({d, provider, send, prepared, dispatched}) => {
      // An earlier Alpha prepared this exact email under its own request ID, and nothing was sent.
      const earlier = d.make(), email = crewEmail('Pack the tripod.');
      await earlier.prepare({kind: 'send', ...email.proposal}, {draftId: email.draftId});
      const earlierId = earlier.snapshot().requestId;
      assert.equal(d.slot().phase, 'review');
      await provider.bind('grant-a');
      const result = await send('Pack the tripod.');
      // The saved review is not reused under its old ID: the email is prepared once more.
      assert.equal(prepared.length, 1);
      assert.notEqual(prepared[0], earlierId);
      assert.equal(d.remote.receipts.get(earlierId).state, 'prepared', 'the earlier review was never dispatched');
      if (journal === 'names') {
        assert.deepEqual(result, {state: 'unsent', detail: 'Update Alpha before sending this email.'});
        assert.deepEqual(dispatched, []);
      } else {
        assert.equal(result.state, 'sent');
        assert.deepEqual(prepared, [email.requestId]);
        assert.deepEqual(dispatched, [[email.requestId, 'Pack the tripod.']]);
      }
    });
  });

for (const [change, body] of [['retried unchanged', 'Pack the tripod.'], ['edited', 'Pack the tripod and the blue notebook.']])
  test(`with the pinned journal, a chat email ${change} after an undispatched prepare is sent once under the ID its content names`, async () => {
    await withChatSend('pinned', async ({d, provider, send, prepared, dispatched}) => {
      await provider.bind('grant-a');
      const first = crewEmail('Pack the tripod.'), next = crewEmail(body);
      // Cloud prepares the first Send, but its answer never arrives, so nothing is dispatched.
      d.lose = 1;
      assert.equal((await send('Pack the tripod.')).state, 'unsent');
      assert.deepEqual(prepared, [first.requestId]);
      assert.deepEqual(dispatched, []);
      const result = await send(body);
      assert.equal(result.state, 'sent');
      assert.deepEqual(prepared, [first.requestId, next.requestId]);
      assert.deepEqual(dispatched, [[next.requestId, body]]);
      if (change === 'edited') {
        assert.notEqual(next.requestId, first.requestId);
        // One request ID per turn would have been refused for the edited email.
        await assert.rejects(d.client.gmailPrepareOperation('grant-a', first.requestId, {kind: 'send', ...next.proposal}), /already bound to a different reviewed operation/);
      } else assert.equal(next.requestId, first.requestId);
    });
  });

test('restore clears a rejected legacy chat prepare and retains a valid prepare', async () => {
  const account = {environment: 'production', userId: 'owner-1'};
  const owner = JSON.stringify(['production', account.userId, '']);
  const d = device(owner);
  const key = 'inbox-operation:v1:' + await sha(JSON.stringify([owner, 'grant-a']));
  globalThis.inboxControlsFixture = {store: d.store, controller: {getCloudClient: () => ({client: d.client, sessionId: 'session-1'}), getSnapshot: () => ({cloudAccount: account})}};
  globalThis.document = {documentElement: {dataset: {connectionMode: 'live'}}};
  try {
    const {inboxProviderControls} = await controls();
    for (const version of ['0', '5']) {
      const requestId = `00000000-0000-${version}000-8000-000000000001`;
      const draftId = `agent-email:${requestId}`;
      const record = {
        version: 1, owner, grantId: 'grant-a',
        requestId, proposal: {kind: 'send'}, phase: 'preparing', review: null, receipt: null,
        source: {draftId}, composer: {draftId},
      };
      d.slots.set(key, record);
      await inboxProviderControls(() => {}, () => {}).bind('grant-a');
      assert.deepEqual(d.slot(), version === '0' ? null : record);
    }
    assert.equal(d.remote.receipts.size, 0);
    assert.equal(d.remote.dispatches, 0);
  } finally {
    delete globalThis.inboxControlsFixture;
    delete globalThis.document;
  }
});

test('a manual Send never dispatches a composer that changed during preparation', async () => {
  const account = {environment: 'production', userId: 'owner-1'};
  const d = device(JSON.stringify(['production', 'owner-1', '']));
  const toasts = [];
  const started = Promise.withResolvers();
  const released = Promise.withResolvers();
  const prepare = d.client.gmailPrepareOperation;
  d.client.gmailPrepareOperation = async (...args) => {
    started.resolve();
    await released.promise;
    return prepare(...args);
  };
  globalThis.inboxControlsFixture = {store: d.store, controller: {getCloudClient: () => ({client: d.client, sessionId: 'session-1'}), getSnapshot: () => ({cloudAccount: account})}};
  globalThis.document = {documentElement: {dataset: {connectionMode: 'live'}}};
  try {
    const {inboxProviderControls} = await controls();
    const provider = inboxProviderControls(() => {}, text => toasts.push(text));
    const proposal = {kind: 'send', mode: 'compose', to: ['reader@example.invalid'], cc: [], bcc: [], subject: 'Approved email', bodyText: 'First version', attachments: []};
    let composer = {draftId: 'draft-1', proposal};
    provider.setComposer(() => composer);
    await provider.bind('grant-a');
    const send = provider.prepare(proposal, {draftId: 'draft-1'}, 'send-from-composer');
    await started.promise;
    composer = {...composer, proposal: {...proposal, bodyText: 'Edited version'}};
    released.resolve();
    await send;
    assert.equal(d.remote.dispatches, 0);
    assert.equal(d.slot(), null);
    assert.equal(provider.render().providerReview, false);
    assert.equal(toasts.at(-1), 'Email changed before sending. Check it and tap Send again.');
  } finally {
    released.resolve();
    delete globalThis.inboxControlsFixture;
    delete globalThis.document;
  }
});

async function directSendAfter(earlier) {
  const account = {environment: 'production', userId: 'owner-1'};
  const d = device(JSON.stringify(['production', 'owner-1', '']));
  const toasts = [];
  globalThis.inboxControlsFixture = {store: d.store, controller: {getCloudClient: () => ({client: d.client, sessionId: 'session-1'}), getSnapshot: () => ({cloudAccount: account})}};
  globalThis.document = {documentElement: {dataset: {connectionMode: 'live'}}};
  try {
    const {inboxProviderControls} = await controls();
    const provider = inboxProviderControls(() => {}, text => toasts.push(text));
    const proposal = {kind: 'send', mode: 'compose', to: ['reader@example.invalid'], cc: [], bcc: [], subject: 'Hello', bodyText: 'Body', attachments: []};
    provider.setComposer(() => ({draftId: 'draft-1', proposal}));
    await provider.bind('grant-a');
    await earlier(provider, d);
    const before = d.remote.dispatches;
    await provider.prepare(proposal, {draftId: 'draft-1'}, 'send-from-composer');
    await until(() => !provider.render().provider.busy, 'the send');
    return {d, toasts, provider, sent: d.remote.dispatches - before};
  } finally {
    delete globalThis.inboxControlsFixture;
    delete globalThis.document;
  }
}

for (const kind of ['archive', 'trash']) {
  test(`one-tap Send after a settled ${kind} receipt clears the receipt and dispatches once`, async () => {
    const {d, toasts, provider, sent} = await directSendAfter(async (provider, d) => {
      await provider.prepare({...archive, kind});
      provider.render().provider.confirm();
      await until(() => d.slot()?.phase === 'observed' && !provider.render().provider.busy, 'the confirmed ' + kind);
    });
    assert.equal(sent, 1, 'the email is dispatched exactly once');
    assert.equal(d.slot().proposal.kind, 'send');
    assert.equal(d.slot().receipt.state, 'succeeded');
    assert.deepEqual(toasts, ['Sent.']);
    assert.equal(provider.render().providerReview, false);
  });
}

test('checking a restored Gmail draft send receipt keeps the review open and reports Sent once', async () => {
  const account = {environment: 'production', userId: 'owner-1'}, owner = JSON.stringify(['production', 'owner-1', '']);
  const d = device(owner), toasts = [];
  globalThis.inboxControlsFixture = {store: d.store, controller: {getCloudClient: () => ({client: d.client, sessionId: 'session-1'}), getSnapshot: () => ({cloudAccount: account})}};
  globalThis.document = {documentElement: {dataset: {connectionMode: 'live'}}};
  try {
    const {inboxProviderControls} = await controls();
    const provider = inboxProviderControls(() => {}, text => toasts.push(text));
    const proposal = {kind: 'send', mode: 'compose', to: ['reader@example.invalid'], cc: [], bcc: [], subject: 'Hello', bodyText: 'Body', attachments: []};
    const source = {draftId: 'draft-1', providerDraft: {draftId: 'gmail-draft-1', providerDigest: 'a'.repeat(64)}};
    provider.setComposer(() => ({draftId: 'draft-1', proposal}));
    await provider.bind('grant-a');
    await provider.prepare(proposal, source, 'send-from-composer');
    await until(() => !provider.render().provider.busy, 'the send');
    assert.equal(d.remote.dispatches, 1);
    assert.deepEqual(toasts, ['Sent.']);
    assert.equal(provider.render().providerReview, false);
    // After a restart the receipt is reopened from its chip and checked again.
    const restarted = inboxProviderControls(() => {}, text => toasts.push(text));
    await restarted.bind('grant-a');
    assert.equal(restarted.render().providerReview, false);
    const chips = restarted.chips((label, action) => ({label, action}));
    assert.deepEqual(chips.map(chip => chip.label), ['Mail review / receipt']);
    chips[0].action();
    assert.equal(restarted.render().providerReview, true);
    restarted.render().provider.check();
    await until(() => !restarted.render().provider.busy, 'the check');
    assert.deepEqual(toasts, ['Sent.'], 'the earlier send is not reported again');
    assert.equal(restarted.render().providerReview, true, 'the checked receipt stays on view');
    assert.equal(d.remote.dispatches, 1);
  } finally {
    delete globalThis.inboxControlsFixture;
    delete globalThis.document;
  }
});

test('one-tap Send behind an unsent review of another change opens the review sheet and sends nothing', async () => {
  const {d, toasts, provider, sent} = await directSendAfter(async provider => {
    await provider.prepare(archive);
  });
  assert.equal(sent, 0, 'nothing is dispatched');
  assert.equal(d.slot().proposal.kind, 'archive', 'the saved review is kept for the owner');
  assert.equal(d.slot().phase, 'review');
  assert.equal(provider.render().providerReview, true, 'the review sheet is shown so the owner can resolve it');
  assert.deepEqual(toasts, [], 'the open review is the only notice');
  assert.equal(provider.render().provider.status, 'Review the saved email action before starting another.');
});

test('the review sheet keeps a confirmed receipt when Check gets a regressed answer, and never dispatches again', async () => {
  const account = {environment: 'production', userId: 'owner-1'}, owner = JSON.stringify(['production', 'owner-1', '']);
  const d = device(owner), toasts = [];
  globalThis.inboxControlsFixture = {store: d.store, controller: {getCloudClient: () => ({client: d.client, sessionId: 'session-1'}), getSnapshot: () => ({cloudAccount: account})}};
  globalThis.document = {documentElement: {dataset: {connectionMode: 'live'}}};
  try {
    const {inboxProviderControls} = await controls();
    const provider = inboxProviderControls(() => {}, text => toasts.push(text));
    await provider.bind('grant-a');
    await provider.prepare(archive);
    assert.equal(provider.render().provider.canConfirm, true);
    provider.render().provider.confirm();
    await until(() => d.slot()?.phase === 'observed' && !provider.render().provider.busy, 'the confirmed archive');
    assert.equal(d.remote.dispatches, 1); assert.equal(d.slot().receipt.state, 'succeeded');
    // The provider regresses; the owner taps Check, then Confirm, twice.
    d.remote.answer = 'prepared';
    provider.render().provider.check();
    await until(() => {
      const review = provider.render().provider;
      return review.status === regressedReceiptRefusal && !review.busy;
    }, 'the refused check');
    const shown = provider.render().provider;
    // The owner is told, in Alpha's words, that nothing changed and not to repeat it.
    assert.deepEqual(toasts, [], 'the open review is the only notice');
    assert.equal(shown.status, regressedReceiptRefusal, 'the review status keeps the guard’s guidance');
    assert.equal(shown.canConfirm, false, 'Confirm is not offered again');
    assert.equal(d.slot().phase, 'observed'); assert.equal(d.slot().receipt.state, 'succeeded');
    shown.confirm(); await new Promise(resolve => setTimeout(resolve, 20)); provider.render().provider.confirm();
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(d.remote.dispatches, 1, 'one dispatch for the request');
    // After a restart the saved receipt is loaded and the regressed answer is refused again.
    const restarted = inboxProviderControls(() => {}, text => toasts.push(text));
    await restarted.bind('grant-a');
    assert.equal(restarted.render().provider.canConfirm, false);
    assert.equal(d.slot().phase, 'observed'); assert.equal(d.remote.dispatches, 1);
  } finally { delete globalThis.inboxControlsFixture; delete globalThis.document; }
});

test('the review sheet does not offer or dispatch a saved review after a restart under a withdrawn grant', async () => {
  const account = {environment: 'production', userId: 'owner-1'}, owner = JSON.stringify(['production', 'owner-1', '']);
  const d = device(owner), toasts = [];
  await d.make().prepare(archive);
  assert.equal(d.slot().phase, 'review');
  // A new process: no earlier account read exists to report the withdrawal; only capabilities do.
  d.remote.caps.mailboxMutations = false;
  globalThis.inboxControlsFixture = {store: d.store, controller: {getCloudClient: () => ({client: d.client, sessionId: 'session-1'}), getSnapshot: () => ({cloudAccount: account})}};
  globalThis.document = {documentElement: {dataset: {connectionMode: 'live'}}};
  try {
    const {inboxProviderControls} = await controls();
    const provider = inboxProviderControls(() => {}, text => toasts.push(text));
    await provider.bind('grant-a');
    const shown = provider.render().provider;
    assert.equal(shown.canConfirm, false, 'Confirm is not offered');
    shown.confirm(); await until(() => toasts.length > 0, 'the refusal');
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(d.remote.dispatches, 0, 'nothing is dispatched'); assert.equal(d.slot().phase, 'review');
    // With the capability restored the same review can be confirmed.
    d.remote.caps.mailboxMutations = true; await provider.bind('grant-a');
    assert.equal(provider.render().provider.canConfirm, true);
  } finally { delete globalThis.inboxControlsFixture; delete globalThis.document; }
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

test('mail keeps its offline snapshots apart from the account document', async () => {
  const slots = new Map(); globalThis.readCacheSlots = slots;
  const {serviceReadCache, readCacheIdentity} = await bundle('apps/app/src/runtime/service-read-cache-store.ts', {
    core: `export const Capacitor={isNativePlatform:()=>true};`,
    'native-connection': `const s=()=>globalThis.readCacheSlots;export const secureConnectionStore={read:async slot=>structuredClone(s().get(slot)??null),compareExchange:async(slot,before,value)=>{if(JSON.stringify(s().get(slot)??null)!==JSON.stringify(before))return {status:'conflict'};if(value===null)s().delete(slot);else s().set(slot,structuredClone(value));return {status:'saved'};}};`,
    'json-domain-document': `export class BrowserJsonDomainDocument{}`,
  });
  try {
    const account = {environment: 'production', userId: 'user', organizationId: 'org', credentialId: 'credential'};
    assert.equal(readCacheIdentity(account), JSON.stringify(['production', 'user', 'org', 'credential']), 'the account document keeps its identity');
    assert.notEqual(readCacheIdentity(account, 'gmail'), readCacheIdentity(account));
    // Mail never reads the account document; Calendar's entries stay there.
    const shared = 'connected-read-cache:v1:' + await sha(readCacheIdentity(account));
    slots.set(shared, {version: 1, owner: readCacheIdentity(account), entries: [{key: 'calendar:owner:v1', value: 'saved owner', at: Date.now()}]});
    const calendar = await serviceReadCache(account), mail = await serviceReadCache(account, 'gmail');
    assert.notEqual(mail, calendar); assert.equal(await serviceReadCache(account, 'gmail'), mail, 'one handle per document'); assert.equal(await serviceReadCache(account), calendar);
    assert.equal(await mail.get('gmail:mailbox'), null, 'mail starts empty');
    assert.equal((await calendar.get('calendar:owner:v1')).value, 'saved owner');
    await mail.put('gmail:mailbox', {messages: ['saved mail']}); await calendar.put('calendar:feed', {events: ['saved event']});
    assert.equal(slots.size, 2); for (const slot of slots.keys()) assert.match(slot, /^connected-read-cache:v1:[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(slots.get(shared)).includes('saved mail'), false, 'mail is never written to the account document');
    // Mail loses its grant and clears its cache: Calendar's saved entries stay, and a Calendar write in flight lands.
    const pending = calendar.put('calendar:next', 'in flight'); await mail.clear(); await pending;
    assert.equal(await mail.get('gmail:mailbox'), null);
    assert.deepEqual((await calendar.get('calendar:feed')).value, {events: ['saved event']});
    assert.equal((await calendar.get('calendar:next')).value, 'in flight');
    assert.equal((await calendar.get('calendar:owner:v1')).value, 'saved owner');
    // And the reverse.
    await mail.put('gmail:mailbox', {messages: ['again']}); await calendar.clear();
    assert.deepEqual((await mail.get('gmail:mailbox')).value, {messages: ['again']});
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

test('the saved mailbox keeps the newest bodies that fit, each measured once', () => {
  const {cachedJsonBytes, newestMailBodies} = mailbox;
  let encodes = 0; const body = (id, size) => ({id, text: 'x'.repeat(size), toJSON() { encodes++; return {id, text: this.text}; }});
  const first = body('a', 10);
  const bytes = cachedJsonBytes(first); assert.equal(bytes, new TextEncoder().encode(JSON.stringify({id: 'a', text: 'x'.repeat(10)})).length);
  encodes = 0; assert.equal(cachedJsonBytes(first), bytes); assert.equal(encodes, 0, 'a second measurement does not serialise');
  const list = ['a', 'b', 'c', 'd'].map(id => ({at: 1, body: body(id, 1000)})), one = cachedJsonBytes(list[0].body);
  assert.deepEqual(newestMailBodies(list, one * 2).map(row => row.body.id), ['c', 'd'], 'the newest bodies that fit, in order');
  assert.deepEqual(newestMailBodies(list, one * 2 - 1).map(row => row.body.id), ['d']);
  assert.deepEqual(newestMailBodies(list, 0), []); assert.equal(newestMailBodies(list, one * 9).length, 4);
  encodes = 0; newestMailBodies(list, one * 9); newestMailBodies(list, one); assert.equal(encodes, 0, 'saving again serialises no body to measure it');
});
