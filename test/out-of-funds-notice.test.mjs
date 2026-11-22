// Out of plan allowance and credits (apps/app/src/runtime/out-of-funds-notice.ts, the voice surface
// apps/app/src/prototype/voice-adapter.ts and the chat refusal in apps/app/src/runtime/connection-ui.tsx).
// The agent has no funds to say why it stopped, so the chat transcript gets one fixed line: Talk
// ends as at Stop and posts it once, a refused chat turn answers with the same line, and every other
// voice failure keeps its own handling.
//
// The surface tests run the real adapter in the voice view fixture. Controlled ports: the Cloud
// recording driver, the fake clock and the shell's transcript.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cloudVoiceViewFixture} from './fixtures/cloud-voice-view.mjs';
import {voiceFakeClock} from './fixtures/shared-batch-voice.mjs';

const N = await import('../apps/app/src/runtime/out-of-funds-notice.ts');
const {formatMonthDay} = await import('../apps/app/src/prototype/locale-time.ts');
const {readServiceLimit} = await import('../.eliza/client-features/packages/cloud/sdk/src/subscription-entitlement.ts');

const TALK = 'You’re out of plan allowance and credits, so Talk stopped.';
const CHAT = 'You’re out of plan allowance and credits, so I couldn’t reply.';
const NOW = Date.UTC(2026, 10, 22, 12);
const coded = (code, extra = {}) => Object.assign(Error('Cloud streaming speech is unavailable.'), {code, ...extra});

test('one wording for Talk and chat, with the reset date only when one is ahead', () => {
  assert.equal(N.outOfFundsNotice('talk', null, NOW), TALK);
  assert.equal(N.outOfFundsNotice('chat', null, NOW), CHAT);
  const reset = NOW + 5 * 86_400_000, day = formatMonthDay(new Date(reset));
  assert.equal(N.outOfFundsNotice('talk', reset, NOW), `${TALK} Your allowance resets on ${day}.`);
  assert.equal(N.outOfFundsNotice('chat', reset, NOW), `${CHAT} Your allowance resets on ${day}.`);
  assert.equal(N.outOfFundsNotice('talk', NOW - 1, NOW), TALK, 'a lapsed reset is not stated');
  for (const text of [N.outOfFundsNotice('talk', reset, NOW), N.outOfFundsNotice('chat', reset, NOW)])
    assert.doesNotMatch(text, /[–—]|credits?\b.*\$|http|402|insufficient/i, 'no dashes, amounts or server jargon');
});

test('only a Cloud funds refusal reads as out of funds', () => {
  for (const failure of [
    coded('insufficient_credits'), coded('allowance_exhausted'), coded('voice-http-402'),
    coded('voice-http-429', {data: {limitCode: 'allowance_exhausted', retryAfterSeconds: 60}}),
    Object.assign(Error('reply'), {code: 'transport-failed', failureKind: 'insufficient_credits', serviceLimit: 'billing-refused'}),
    {failureKind: 'billing-refused'}, {serviceLimit: 'allowance-exhausted'},
  ]) assert.equal(N.outOfFundsRefusal(failure), true, JSON.stringify(failure));
  for (const failure of [
    null, undefined, 'insufficient_credits', Error('Voice stopped'), coded('unavailable'), coded('expired'),
    coded('connection-lost'), coded('protocol'), coded('capture'), coded('voice-http-503'), coded('voice-http-401'),
    coded('voice-http-429', {data: {limitCode: 'rate_limited', retryAfterSeconds: 5}}), coded('billing_hold_active'),
    {failureKind: 'rate_limited', serviceLimit: 'rate-limited'}, {serviceLimit: 'subscription-required'}, {failureKind: 'no_provider'},
  ]) assert.equal(N.outOfFundsRefusal(failure), false, JSON.stringify(failure));
  // The chat refusal arrives as Cloud's 402 body; the shared reader names it.
  assert.equal(N.outOfFundsLimit(readServiceLimit({status: 402, data: {error: {code: 'insufficient_credits'}}}, NOW)), true);
  assert.equal(N.outOfFundsLimit(readServiceLimit({status: 402, data: {error: {code: 'allowance_exhausted'}}}, NOW)), true);
  assert.equal(N.outOfFundsLimit(readServiceLimit({status: 429, data: {error: {code: 'rate_limited'}}}, NOW)), false);
  assert.equal(N.outOfFundsLimit(null), false);
});

test('the reset date comes from the refusal, then the verified plan allowance', () => {
  const ahead = NOW + 86_400_000, later = NOW + 2 * 86_400_000;
  assert.equal(N.outOfFundsResetsAt(NOW, {kind: 'billing-refused', resetsAt: ahead}, {kind: 'active', allowance: {resetsAt: later}}), ahead);
  assert.equal(N.outOfFundsResetsAt(NOW, {kind: 'billing-refused', resetsAt: null}, {kind: 'active', allowance: {resetsAt: later}}), later);
  assert.equal(N.outOfFundsResetsAt(NOW, null, {kind: 'credits', source: 'billing-limits'}, {kind: 'active', allowance: null}), null);
  assert.equal(N.outOfFundsResetsAt(NOW, {resetsAt: NOW - 1}), null);
});

test('a refused chat turn answers with the same line, once, in place of the billing label', () => {
  // replyFailure is private to the connection controller: its funds branches are bound to this module.
  const ui = readFileSync(new URL('../apps/app/src/runtime/connection-ui.tsx', import.meta.url), 'utf8');
  assert.match(ui, /const outOfFunds=outOfFundsLimit\(limit\)\|\|!limit&&outOfFundsRefusal\(\{failureKind:kind\}\);/);
  assert.match(ui, /outOfFundsNotice\('chat',outOfFundsResetsAt\(Date\.now\(\),limit,state\.residentSubscription,state\.membershipPlan\)\)/);
  assert.match(ui, /if\(funding\)\{void refreshMembershipBalance\(\);return Object\.assign\(new AlphaClientError\('transport-failed',fundsText\(\)\)/);
  assert.match(ui, /new AlphaClientError\('transport-failed',outOfFunds\?fundsText\(\):serviceLimitMessage\(/);
  assert.match(ui, /if\(outOfFunds\)return failed\(fundsText\(\)\);/);
  assert.doesNotMatch(ui, /fundingRefusedReply|insufficient_credits: 'Billing declined'/, 'no second chat wording');
  // The chat posts the refused turn's message as one agent entry (agent-adapter.ts, unchanged).
  const adapter = readFileSync(new URL('../apps/app/src/prototype/agent-adapter.ts', import.meta.url), 'utf8');
  assert.match(adapter, /else this\.setState\(\(previous:Shell\)=>\(\{chat:previous\.chat==='full'\?'full':'sheet',msgs:\[\.\.\.\(previous\.msgs\|\|\[\]\),\{id:crypto\.randomUUID\(\),from:'agent',text:message,card:planCard\?\?null,interrupted:true\}\]\}\)\);/);
});

/** The real voice surface with a shell that commits state updates as React does. */
function surface(options = {}) {
  const clock = voiceFakeClock();
  const f = cloudVoiceViewFixture({cloudProfile: true, native: true, platform: 'android', clock, peak: 0, transcript: 'spoken', ...options});
  f.box.React = {createElement: () => null}; f.box.VoiceActivity = () => null; f.box.HTMLElement = class {};
  f.box.nativeLiveVoiceReady = async () => false;
  const shell = f.shell, setState = shell.setState.bind(shell);
  let committing = false;
  shell.setState = (patch, callback) => { setState(patch, callback); if (committing) return; committing = true; queueMicrotask(() => { committing = false; if (shell.live !== false) shell.componentDidUpdate(); }); };
  const settle = async () => { await clock.flush(); await clock.advance(0); };
  return {f, shell, clock, settle, panel: () => f.renderChat(),
    // The transcript's arrays belong to the fixture's realm.
    notices: () => Array.from(shell.state.msgs).filter(message => message.text?.startsWith('You’re out of plan allowance')),
    async start() { await shell.startVoice(); await settle(); },
    async speak() { f.peak = 0.5; await clock.advance(700); f.peak = 0; await clock.advance(1200); await settle(); }};
}

test('Talk refused at its start ends quietly with one line in the chat', async () => {
  const s = surface();
  s.f.error = coded('insufficient_credits');
  await s.start();
  assert.equal(s.panel()?.state, 'listening');
  await s.speak();
  assert.equal(s.panel(), null, 'Talk ends as at Stop: no error panel, no Try again');
  assert.deepEqual(s.notices().map(message => [message.from, message.text]), [['agent', TALK]]);
  assert.equal(s.f.sends, 0, 'nothing reached the agent');
  assert.deepEqual(s.shell.messages, [], 'no toast');
  assert.equal(s.shell.state.chat, 'sheet', 'the chat with the line is shown');
  await s.clock.advance(10_000); await s.settle();
  assert.equal(s.f.starts, 1, 'nothing retries on its own');
  assert.equal(s.notices().length, 1);
});

test('Talk that cannot renew its next minute posts the line once, not per retry', async () => {
  const s = surface();
  await s.start();
  await s.speak();
  assert.equal(s.f.sends, 1, 'the first minute was answered');
  assert.equal(s.panel()?.state, 'listening');
  // Cloud refuses the next minute: the shared refusal reason reaches the conversation's turn.
  s.f.error = coded('insufficient_credits');
  await s.speak();
  assert.equal(s.panel(), null);
  assert.deepEqual(s.notices().map(message => message.text), [TALK]);
  // A late report from the ended session, or more time, never adds a second line.
  await s.clock.advance(30_000); await s.settle();
  assert.equal(s.notices().length, 1);
  assert.equal(s.f.starts, 2, 'no capture opens after the refusal');
  // The owner starts Talk again while still out of funds: that stop says it once more.
  await s.start(); await s.speak();
  assert.equal(s.notices().length, 2);
});

test('an agent turn Cloud refuses for funds ends Talk with the same line', async () => {
  const s = surface();
  s.shell.sendVoiceTurn = async () => { throw Object.assign(Error(CHAT), {code: 'transport-failed', failureKind: 'insufficient_credits', serviceLimit: 'billing-refused'}); };
  await s.start();
  await s.speak();
  assert.equal(s.panel(), null);
  assert.deepEqual(s.notices().map(message => message.text), [TALK], 'the Talk line, not the chat one');
});

test('every other voice failure keeps its own handling and posts nothing', async () => {
  for (const failure of [Error('Cloud transcription failed'), coded('voice-stt-response'), coded('expired'), coded('protocol'), coded('capture')]) {
    const s = surface();
    const before = s.shell.state.msgs.length;
    s.f.error = failure;
    await s.start(); await s.speak();
    assert.equal(s.notices().length, 0, String(failure.code ?? failure.message));
    assert.equal(s.shell.state.msgs.length, before, 'no transcript entry at all');
    assert.equal(s.panel()?.state, 'error', 'its existing voice panel state is unchanged');
    s.close?.();
  }
});
