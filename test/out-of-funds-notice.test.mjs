// Out of plan allowance and credits (apps/app/src/runtime/out-of-funds-notice.ts, the voice surface
// apps/app/src/prototype/voice-adapter.ts and the chat refusal in apps/app/src/runtime/connection-ui.tsx).
// The agent has no funds to say why it stopped, so the chat transcript gets one fixed line: Talk
// ends as at Stop and posts it once, a refused chat turn answers with the same line, and every other
// failure keeps its own handling. Only Cloud's own code counts: a billing hold or a bare billing
// kind keeps "Billing declined".
//
// The chat tests run the shipped replyFailure and restoredMessages members of connection-ui.tsx with
// held ports in place of the controller state. The surface tests run the real adapter in the voice
// view fixture, on the batch route and on the native Cloud streaming route (the shared transport and
// assistant session, whole). Controlled ports: the Cloud recording driver, the native speech bridge's
// events, the fake clock and the shell's transcript.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from './support/strip-types.mjs';
import {cloudVoiceViewFixture} from './fixtures/cloud-voice-view.mjs';
import {voiceFakeClock} from './fixtures/shared-batch-voice.mjs';

const N = await import('../apps/app/src/runtime/out-of-funds-notice.ts');
const {formatMonthDay} = await import('../apps/app/src/prototype/locale-time.ts');
const {readServiceLimit} = await import('../.eliza/client-features/packages/cloud/sdk/src/subscription-entitlement.ts');
const {serviceLimitMessage} = await import('../apps/app/src/runtime/subscription-entitlement.ts');
const {AlphaClientError} = await import('../apps/app/src/runtime/alpha-client.ts');

const TALK = 'You’re out of plan allowance and credits, so Talk stopped.';
const CHAT = 'You’re out of plan allowance and credits, so I couldn’t reply.';
const OFFER = {type: 'generic', icon: 'info', title: 'Subscription', sub: '', planAction: 'funding'};
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
  assert.deepEqual(N.subscriptionOfferCard(), OFFER);
});

test('only Cloud’s own out-of-funds code reads as out of funds', () => {
  for (const code of ['insufficient_credits', 'allowance_exhausted']) assert.equal(N.outOfFundsCode(code), true, code);
  for (const code of [undefined, null, 'billing_hold_active', 'payment_required', 'insufficient_quota', 'quota_exceeded', 'rate_limited', 'billing-refused', 'allowance-exhausted'])
    assert.equal(N.outOfFundsCode(code), false, String(code));
  // Talk: the speech bridge's refusal code, or an agent turn the chat already read as out of funds.
  for (const failure of [
    coded('insufficient_credits'), coded('allowance_exhausted'),
    Object.assign(Error(CHAT), {code: 'transport-failed', failureKind: 'insufficient_credits', serviceLimit: 'billing-refused', outOfFunds: true}),
  ]) assert.equal(N.outOfFundsRefusal(failure), true, JSON.stringify(failure));
  for (const failure of [
    null, undefined, 'insufficient_credits', Error('Voice stopped'), coded('unavailable'), coded('expired'),
    coded('connection-lost'), coded('protocol'), coded('capture'), coded('voice-http-503'), coded('voice-http-401'),
    // A Cloud speech 402 carries no code and can be a billing hold; a speech 429's allowance is the voice allowance.
    coded('voice-http-402'), coded('voice-http-429', {data: {limitCode: 'allowance_exhausted', retryAfterSeconds: 60}}),
    coded('voice-http-429', {data: {limitCode: 'rate_limited', retryAfterSeconds: 5}}), coded('billing_hold_active'),
    // A chat refusal the chat did not read as out of funds: a hold, a bare billing kind, a derived limit.
    Object.assign(Error('Billing declined'), {code: 'transport-failed', failureKind: 'insufficient_credits', serviceLimit: 'billing-refused', planAction: 'funding'}),
    {failureKind: 'billing-refused'}, {serviceLimit: 'allowance-exhausted'}, {failureKind: 'rate_limited', serviceLimit: 'rate-limited'},
  ]) assert.equal(N.outOfFundsRefusal(failure), false, JSON.stringify(failure));
});

test('the reset date comes from the refusal, then the verified plan allowance', () => {
  const ahead = NOW + 86_400_000, later = NOW + 2 * 86_400_000;
  assert.equal(N.outOfFundsResetsAt(NOW, {kind: 'billing-refused', resetsAt: ahead}, {kind: 'active', allowance: {resetsAt: later}}), ahead);
  assert.equal(N.outOfFundsResetsAt(NOW, {kind: 'billing-refused', resetsAt: null}, {kind: 'active', allowance: {resetsAt: later}}), later);
  assert.equal(N.outOfFundsResetsAt(NOW, null, {kind: 'credits', source: 'billing-limits'}, {kind: 'active', allowance: null}), null);
  assert.equal(N.outOfFundsResetsAt(NOW, {resetsAt: NOW - 1}), null);
});

// --- The chat's refusal: the shipped replyFailure and restoredMessages ----------------------------

const ui = readFileSync(new URL('../apps/app/src/runtime/connection-ui.tsx', import.meta.url), 'utf8');
const between = (start, end) => { const from = ui.indexOf(start), to = ui.indexOf(end, from + start.length); assert.ok(from >= 0 && to > from, start); return ui.slice(from, to); };
const chatSource = stripTypeScriptTypes([
  between('export const REPLY_FAILURES = {', '/** After a failed reply or a lost network'),
  between('function restoredMessages(', '/** Eliza Cloud\'s API answers'),
  'Object.assign(globalThis,{replyFailure,restoredMessages,failureKindOf,terminalCodeOf});',
].join('\n').replaceAll('export const ', 'const '), {mode: 'strip'});

/** The chat's failure members with held controller state. `refuse` composes a failed reply as the send path does. */
function chat({signedIn = true, plan = null} = {}) {
  const patches = [], held = {balanceReads: 0, rechecks: 0};
  const state = {cloudAccount: signedIn ? {environment: 'production', userId: 'synthetic-user'} : null, residentSubscription: plan, membershipPlan: null};
  const box = {
    state, AlphaClientError, serviceLimitMessage, outOfFundsCode: N.outOfFundsCode, outOfFundsNotice: N.outOfFundsNotice, outOfFundsResetsAt: N.outOfFundsResetsAt,
    update: patch => { patches.push(patch); Object.assign(state, patch); }, refreshMembershipBalance: async () => { held.balanceReads++; },
    connectionController: {recheckPlanAfterRefusal: () => { held.rechecks++; }}, cloud: {environment: 'production'}, cloudServiceName: () => 'Eliza Cloud',
    testMocksEnabled: false, isAndroid: true, residentCloudFlow: () => true, residentSignInExpired: () => 'Sign-in expired', inferenceUnavailableReply: () => 'AI off',
    isCalendarReadFailureCode: () => false, systemNoticeKind: () => undefined, systemNoticeDisplayText: () => '', restoredText: text => text, checkinDisplayText: () => undefined,
    Date: {now: () => NOW},
  };
  vm.runInNewContext(chatSource, box, {filename: 'connection-ui.tsx (reply failures)'});
  const refuse = reply => box.replyFailure(box.failureKindOf(reply), {kind: 'resident'}, readServiceLimit({failureKind: reply.failureKind, terminalFailure: reply.terminalFailure}, NOW), box.terminalCodeOf(reply));
  return {box, state, patches, held, refuse};
}
const refusal = (code, extra = {}) => ({failureKind: 'insufficient_credits', terminalFailure: {kind: 'insufficient_credits', transient: false, ...(code ? {code} : {})}, ...extra});

test('a chat turn Cloud refuses for funds answers with the out-of-funds line and the Subscription sheet', () => {
  for (const code of ['insufficient_credits', 'allowance_exhausted']) {
    const c = chat(), failure = c.refuse(refusal(code));
    assert.ok(failure instanceof AlphaClientError);
    assert.equal(failure.message, CHAT, code);
    assert.equal(failure.outOfFunds, true, 'Talk reads the same decision');
    assert.equal(failure.failureKind, 'insufficient_credits');
    // Cloud's 402 code is a billing refusal (the Subscription sheet); allowance_exhausted is an allowance limit.
    const billing = code === 'insufficient_credits';
    assert.equal(failure.serviceLimit, billing ? 'billing-refused' : 'allowance-exhausted');
    assert.equal(failure.planAction, billing ? 'funding' : undefined);
    assert.equal(c.state.fundingRefused, billing ? true : undefined);
    assert.equal(c.held.balanceReads, billing ? 1 : 0);
    assert.equal(c.state.lastServiceLimit.kind, failure.serviceLimit);
  }
});

test('a billing hold, a generic payment refusal or a bare billing kind keeps Billing declined', () => {
  for (const reply of [refusal('billing_hold_active'), refusal('payment_required'), refusal(undefined), {failureKind: 'insufficient_credits'}]) {
    const c = chat(), failure = c.refuse(reply);
    assert.equal(failure.message, 'Billing declined', JSON.stringify(reply));
    assert.equal(failure.outOfFunds, undefined);
    assert.equal(failure.planAction, 'funding', 'the same Subscription sheet');
    assert.equal(c.state.fundingRefused, true);
    assert.equal(c.held.balanceReads, 1);
  }
  // A period allowance without Cloud's code keeps its own limit wording.
  const period = chat().refuse({failureKind: 'rate_limited', terminalFailure: {kind: 'rate_limited', rateLimit: {kind: 'rate_limited', scope: 'period'}}});
  assert.match(period.message, /^Limit reached/);
  assert.equal(period.outOfFunds, undefined);
});

test('the chat line names a reset only from the refusal or the verified plan, and signed out gets no sheet', () => {
  const resets = NOW + 3 * 86_400_000, day = formatMonthDay(new Date(resets));
  assert.equal(chat({plan: {kind: 'active', allowance: {resetsAt: resets}}}).refuse(refusal('insufficient_credits')).message, `${CHAT} Your allowance resets on ${day}.`);
  assert.equal(chat().refuse(refusal('allowance_exhausted', {terminalFailure: {kind: 'insufficient_credits', code: 'allowance_exhausted', resetAt: new Date(resets).toISOString()}})).message, `${CHAT} Your allowance resets on ${day}.`);
  const signedOut = chat({signedIn: false}), failure = signedOut.refuse(refusal('insufficient_credits'));
  assert.equal(failure.message, CHAT);
  assert.equal(failure.planAction, undefined);
  assert.equal(signedOut.state.fundingRefused, undefined);
});

test('after a history reload the same refusal shows the same line, without a date', () => {
  const c = chat({plan: {kind: 'active', allowance: {resetsAt: NOW + 86_400_000}}});
  const row = (id, extra) => ({id, role: 'assistant', text: 'PRIVATE_PROVIDER_ERROR_CANARY', ...extra});
  const restored = c.box.restoredMessages([
    row('a', refusal('insufficient_credits')), row('b', refusal('allowance_exhausted')),
    row('c', refusal('billing_hold_active')), row('d', {failureKind: 'insufficient_credits'}), row('e', {failureKind: 'rate_limited'}),
  ]);
  assert.deepEqual(Array.from(restored, message => message.text), [CHAT, CHAT, 'This message was declined for billing.', 'This message was declined for billing.', 'This message hit a rate limit.']);
});

// --- Talk ---------------------------------------------------------------------------------------

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
    notices: () => Array.from(shell.state.msgs).filter(message => message.text?.startsWith('You’re out of plan allowance')).map(message => ({from: message.from, text: message.text, card: {...message.card}})),
    async start() { await shell.startVoice(); await settle(); },
    async speak() { f.peak = 0.5; await clock.advance(700); f.peak = 0; await clock.advance(1200); await settle(); }};
}

test('an agent turn Cloud refuses for funds ends Talk with the Talk line and the chat’s offer', async () => {
  const s = surface();
  s.shell.sendVoiceTurn = async () => { throw Object.assign(new AlphaClientError('transport-failed', CHAT), {failureKind: 'insufficient_credits', serviceLimit: 'billing-refused', planAction: 'funding', outOfFunds: true}); };
  await s.start();
  await s.speak();
  assert.equal(s.panel(), null, 'Talk ends as at Stop: no error panel, no Try again');
  assert.deepEqual(s.notices(), [{from: 'agent', text: TALK, card: OFFER}], 'the Talk line, not the chat one');
  assert.equal(s.f.fundsRefusals, undefined, 'the chat’s own refusal already opened the Subscription sheet');
  assert.deepEqual(s.shell.messages, [], 'no toast');
  assert.equal(s.shell.state.chat, 'sheet', 'the chat with the line is shown');
});

test('an agent turn refused for a billing hold keeps its own voice handling', async () => {
  const s = surface();
  s.shell.sendVoiceTurn = async () => { throw Object.assign(new AlphaClientError('transport-failed', 'Billing declined'), {failureKind: 'insufficient_credits', serviceLimit: 'billing-refused', planAction: 'funding'}); };
  const before = s.shell.state.msgs.length;
  await s.start(); await s.speak();
  assert.equal(s.notices().length, 0);
  assert.equal(s.shell.state.msgs.length, before);
  assert.equal(s.panel()?.state, 'error');
});

test('every other voice failure keeps its own handling and posts nothing', async () => {
  for (const failure of [Error('Cloud transcription failed'), coded('voice-stt-response'), coded('expired'), coded('protocol'), coded('capture'),
    coded('voice-http-402'), coded('voice-http-429', {data: {limitCode: 'allowance_exhausted', retryAfterSeconds: 60}}), coded('unavailable')]) {
    const s = surface();
    const before = s.shell.state.msgs.length;
    s.f.error = failure;
    await s.start(); await s.speak();
    const label = String(failure.code ?? failure.message);
    assert.equal(s.notices().length, 0, label);
    assert.equal(s.shell.state.msgs.length, before, `${label}: no transcript entry at all`);
    assert.equal(s.f.fundsRefusals, undefined, label);
    // Network refusals move this conversation to on-device speech (localVoiceFallback); the rest show their panel.
    if (!/^voice-http-|^unavailable$/.test(label)) assert.equal(s.panel()?.state, 'error', `${label}: its existing voice panel state is unchanged`);
  }
});

/**
 * The native Cloud speech bridge (AlphaCloudSpeechStream) as the shared transport sees it. A
 * refusal arrives as the bridge's `error` event, whose code is the relay's refusal reason
 * (`insufficient_credits` or `allowance_exhausted`), and before ready also as the start's rejection.
 */
function speechBridge() {
  const p = {starts: 0, stops: 0, mutes: [], spoken: [], listeners: new Set(), session: null, startError: null, holdAudio: false, utterance: null,
    async addListener(_event, callback) { p.listeners.add(callback); return {remove: async () => { p.listeners.delete(callback); }}; },
    async startCloudSpeech(input) { p.starts++; p.session = input.sessionId; if (p.startError) throw p.startError; return {sessionId: input.sessionId, sampleRate: 16000, echoCancelled: true}; },
    async stopCloudSpeech() { p.stops++; },
    async setCloudSpeechOutputMuted() {},
    async setCloudSpeechMuted({muted}) { p.mutes.push(muted); },
    async speakCloudSpeech({utteranceId, text}) { p.spoken.push(text); p.utterance = utteranceId; if (!p.holdAudio) queueMicrotask(() => p.finishAudio()); },
    finishAudio() { p.emit({type: 'audio-start', utteranceId: p.utterance, elapsedMs: 5}); p.emit({type: 'audio-end', utteranceId: p.utterance, silent: false, playedMs: 400}); },
    async cancelCloudSpeech() { return {playedMs: 0}; },
    emit(event) { for (const callback of [...p.listeners]) callback({sessionId: p.session, ...event}); },
    /** One finished utterance from Cloud's recognizer. */
    say(text) { p.emit({type: 'speech-start'}); p.emit({type: 'speech-end', text, final: true}); },
  };
  return p;
}
function streaming() {
  const bridge = speechBridge(), s = surface({streaming: bridge});
  return {...s, bridge, async turn() { bridge.say('What is on my calendar today'); await s.clock.advance(500); await s.settle(); await s.settle(); }};
}

test('Talk on the streaming bridge: Cloud refusing the start ends it quietly with one line', async () => {
  const s = streaming();
  s.bridge.startError = coded('insufficient_credits');
  await s.start();
  assert.equal(s.bridge.starts, 1);
  assert.equal(s.panel(), null, 'no error panel, no Try again');
  assert.deepEqual(s.notices(), [{from: 'agent', text: TALK, card: OFFER}]);
  assert.equal(s.f.fundsRefusals, 1, 'the Subscription sheet opens as after a refused chat turn');
  assert.deepEqual(s.shell.messages, [], 'no toast');
  assert.equal(s.f.localFactories, 0, 'no move to on-device speech');
  await s.clock.advance(30_000); await s.settle();
  assert.equal(s.bridge.starts, 1, 'nothing retries on its own');
  assert.equal(s.notices().length, 1);
});

test('Talk on the streaming bridge: a refused next minute while listening posts the line once', async () => {
  const s = streaming();
  await s.start();
  assert.equal(s.panel()?.state, 'listening');
  await s.turn();
  assert.equal(s.f.sends, 1, 'the first minute was answered');
  assert.deepEqual(s.bridge.spoken.length > 0, true, 'and spoken');
  assert.equal(s.panel()?.state, 'listening');
  // The relay refuses the renewal: the fixed bridge reports the refusal reason as its error code.
  s.bridge.emit({type: 'error', code: 'insufficient_credits', status: 0});
  await s.settle();
  assert.equal(s.panel(), null);
  assert.deepEqual(s.notices(), [{from: 'agent', text: TALK, card: OFFER}]);
  assert.equal(s.f.fundsRefusals, 1);
  assert.equal(s.f.localFactories, 0, 'no move to on-device speech');
  await s.clock.advance(30_000); await s.settle();
  assert.equal(s.notices().length, 1, 'a late report or more time never adds a second line');
  assert.equal(s.bridge.starts, 1);
});

test('Talk on the streaming bridge: a refusal while the microphone is muted still posts the line', async () => {
  const s = streaming();
  await s.start();
  s.panel().toggleMute(); await s.settle();
  assert.equal(s.panel()?.muted, 'true');
  // The session keeps a muted capture's end to itself; the funds refusal still ends Talk.
  s.bridge.emit({type: 'error', code: 'allowance_exhausted', status: 0});
  await s.settle();
  assert.equal(s.panel(), null);
  assert.deepEqual(s.notices(), [{from: 'agent', text: TALK, card: OFFER}]);
  assert.equal(s.f.fundsRefusals, 1);
});

test('Talk on the streaming bridge: a refusal while Alpha is speaking posts the line once', async () => {
  const s = streaming();
  await s.start();
  s.bridge.holdAudio = true;
  await s.turn();
  assert.equal(s.f.sends, 1);
  assert.equal(s.bridge.spoken.length, 1, 'the reply is on the speaker');
  s.bridge.emit({type: 'audio-start', utteranceId: s.bridge.utterance, elapsedMs: 5});
  await s.settle();
  assert.equal(s.panel()?.state, 'speaking');
  s.bridge.emit({type: 'error', code: 'allowance_exhausted', status: 0});
  await s.settle();
  assert.equal(s.panel(), null);
  assert.deepEqual(s.notices(), [{from: 'agent', text: TALK, card: OFFER}]);
  await s.clock.advance(30_000); await s.settle();
  assert.equal(s.notices().length, 1);
});

test('Talk on the streaming bridge: today’s reasonless relay error keeps its own handling', async () => {
  const s = streaming();
  await s.start();
  const before = s.shell.state.msgs.length;
  s.bridge.emit({type: 'error', code: 'unavailable', status: 0});
  await s.settle();
  assert.equal(s.notices().length, 0);
  assert.equal(s.shell.state.msgs.length, before);
  assert.equal(s.f.fundsRefusals, undefined);
});
