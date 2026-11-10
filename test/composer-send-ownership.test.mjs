import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from './support/strip-types.mjs';

// The shell's composer send (p.send in apps/app/src/prototype/agent-adapter.ts), executed from its
// source with the connection, client and navigation replaced by ports.
const source = readFileSync('apps/app/src/prototype/agent-adapter.ts', 'utf8');
const between = (from, to) => { const start = source.indexOf(from); assert.ok(start >= 0, from); const end = source.indexOf(to, start); assert.ok(end > start, to); return source.slice(start, end); };
const helpers = between('/** One composer send.', 'function selectedCloudName');
const send = between("  const UNSENT_NOTICE=", '  p.agentSay = function');
const sizing = between('  const sizedComposers=', '  const notesDataset=');
class AlphaClientError extends Error { constructor(code, message) { super(message); this.code = code; } }
const code = stripTypeScriptTypes(helpers + send + sizing, {mode: 'strip'}).replace(/^export /gm, '')
  + '\nreturn {composerSendStale,sendOwnsTyping,composerNeedsSizing,sizeComposer};';
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); promise.catch(() => {}); return {promise, resolve, reject}; };
const settle = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };

function harness() {
  const sends = [];
  let composers = [];
  globalThis.document = {hidden: false, querySelector: () => null, querySelectorAll: () => composers};
  const p = {};
  const snapshot = {session: {sessionId: 's-1'}, history: {conversationId: 'c-1'}, open: false};
  const connectionController = {getSnapshot: () => snapshot, getCloudEnvironment: () => undefined, getCloudClient: () => undefined, captureViewNavigation: () => ({}), messageTargetCurrent: () => true, continueRequestedCamera: async () => []};
  const shell = {
    live: true, sendAttempt: null, toasts: [], said: [],
    state: {msgs: [], draft: '', typing: false, chat: 'sheet', view: 'home', shade: false},
    S() { return this.state; },
    setState(patch, done) { const value = typeof patch === 'function' ? patch(this.state) : patch; if (value) this.state = {...this.state, ...value}; done?.(); },
    async connectAgent() {},
    agentSay(text) { this.said.push(text); this.state = {...this.state, msgs: [...this.state.msgs, {id: `said-${this.said.length}`, from: 'agent', text}]}; },
    toast(text) { this.toasts.push(text); },
  };
  const alphaClient = {
    getState: () => ({context: {revision: 1, view: 'home', sensitive: false}, pending: false}),
    send(text) { const reply = deferred(); const entry = {text, reply, attempt: shell.sendAttempt}; sends.push(entry); return reply.promise; },
  };
  const exported = new Function('p', 'connectionController', 'alphaClient', 'context', 'messageReviews', 'sourceOf', 'deliverChatNavigation', 'planActionCard', 'proposalCard', 'retainReadReply', 'replyNotices', 'AlphaClientError', 'CAMERA_CONTEXT_NOTICE', 'NO_AGENT_SEND', 'RESIDENT_STARTING_NOTICE', 'RESIDENT_RECOVERING_NOTICE', code)(
    p, connectionController, alphaClient, () => {}, {confirm: async () => true}, value => value, async () => false, () => undefined, () => null, () => {}, () => [], AlphaClientError, 'camera', 'no agent', 'starting', 'recovering');
  return {...exported, shell, sends, send: (...args) => p.send.call(shell, ...args), setComposers(value) { composers = value; }};
}
const answer = (entry, text = 'Done.') => entry.reply.resolve({text, messageId: 'm-1', userMessageId: 'u-1', messageBinding: {conversationId: 'c-1', session: {sessionId: 's-1'}}});

test('a send given its text reaches the transport with an empty composer; a composer send still needs the composer to hold its text', async () => {
  const h = harness();
  const pending = h.send('Share my location with Sam');
  await settle();
  assert.deepEqual(h.sends.map(entry => entry.text), ['Share my location with Sam'], 'the answer is sent although the composer is empty');
  assert.equal(h.shell.S().typing, true);
  assert.deepEqual(h.shell.S().msgs.map(message => [message.from, message.text]), [['user', 'Share my location with Sam']]);
  answer(h.sends[0]); await pending;
  assert.equal(h.shell.S().typing, false);

  h.shell.state = {...h.shell.state, draft: '  typed text '};
  const typed = h.send();
  await settle();
  assert.equal(h.sends.at(-1).text, 'typed text');
  assert.equal(h.shell.S().draft, '');
  answer(h.sends.at(-1)); await typed;

  assert.equal(h.composerSendStale(undefined, 'changed', 'typed text'), true);
  assert.equal(h.composerSendStale(undefined, ' typed text ', 'typed text'), false);
  assert.equal(h.composerSendStale('answer', '', 'answer'), false);
  assert.equal(h.composerSendStale('answer', 'unrelated draft', 'answer'), false);
});

test('a send cut off by a history reload does not clear the typing indicator of the send that followed it', async () => {
  const h = harness();
  const first = h.send('first message');
  await settle();
  // The transport was called and is still settling when the reload cancels the client request.
  const settling = deferred();
  h.sends[0].attempt.transportCalled = true; h.sends[0].attempt.settled = settling.promise;
  h.shell.setState({typing: false});
  h.sends[0].reply.reject(new AlphaClientError('cancelled', 'Request cancelled.'));
  await settle();
  const second = h.send('second message');
  await settle();
  assert.equal(h.sends.length, 2);
  assert.equal(h.shell.S().typing, true);
  settling.resolve(); await first;
  assert.equal(h.shell.S().typing, true, 'the newer send still shows its reply as pending');
  assert.equal(h.shell.sendAttempt, h.sends[1].attempt, 'the newer attempt is still the tracked one');
  answer(h.sends[1]); await second;
  assert.equal(h.shell.S().typing, false);
  assert.equal(h.shell.sendAttempt, null);
});

test('typing ownership: the finished send clears it unless a newer send or a voice turn owns it', () => {
  const h = harness(), mine = {}, other = {};
  assert.equal(h.sendOwnsTyping(mine, mine, undefined), true);
  assert.equal(h.sendOwnsTyping(null, mine, undefined), true);
  assert.equal(h.sendOwnsTyping(other, mine, undefined), false);
  assert.equal(h.sendOwnsTyping(mine, mine, 'voice-turn'), false);
});

test('the composer is measured only when its text, width or applied height changed', () => {
  const h = harness();
  let reads = 0;
  const style = {height: '44px'};
  const input = {value: 'hello', clientWidth: 300, style, get scrollHeight() { reads++; return 66; }};
  h.setComposers([input]);
  h.sizeComposer();
  assert.equal(reads, 1); assert.equal(style.height, '66px');
  h.sizeComposer(); h.sizeComposer();
  assert.equal(reads, 1, 'an unchanged composer is not laid out again');
  input.value = 'hello there'; h.sizeComposer();
  assert.equal(reads, 2);
  input.clientWidth = 280; h.sizeComposer();
  assert.equal(reads, 3);
  style.height = '44px'; h.sizeComposer();
  assert.equal(reads, 4, 'a render that put the base height back is corrected');
  assert.equal(style.height, '66px');
  assert.equal(h.composerNeedsSizing(undefined, '', 0, ''), true);
  assert.equal(h.composerNeedsSizing({value: 'a', width: 1, height: '44px'}, 'a', 1, '44px'), false);
});
