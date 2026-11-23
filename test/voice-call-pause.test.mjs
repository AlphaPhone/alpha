// Voice and phone calls (apps/app/src/runtime/voice-call-pause.ts and the voice surface,
// apps/app/src/prototype/voice-adapter.ts). A call owns the microphone: the native speech bridge
// refuses and ends capture with `call-active`, and on the Alpha image the call screen is another
// activity, so the page is hidden too. Either way voice closes with one line, never as a failure,
// and the microphone stays closed until the owner starts voice again.
//
// The surface tests run the real adapter in the voice view fixture. Controlled ports: the Cloud
// recording driver, the fake clock, Telecom's call reading and the page's visibility.
import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudVoiceViewFixture} from './fixtures/cloud-voice-view.mjs';
import {voiceFakeClock} from './fixtures/shared-batch-voice.mjs';

const P = await import('../apps/app/src/runtime/voice-call-pause.ts');
const C = await import('../apps/app/src/runtime/call-state.ts');

const ENDED = 'Voice paused for a phone call.', ACTIVE = 'Voice is paused during a phone call.';
/** A panel's lines as text (the panel's arrays belong to the fixture's realm). */
const texts = lines => Array.from(lines, line => line.t);
const refusal = () => Object.assign(Error('Voice is paused while a phone call is active'), {code: 'call-active'});

test('the native call-active code is read in each shape it arrives in', () => {
  assert.equal(P.VOICE_CALL_ENDED, ENDED); assert.equal(P.VOICE_CALL_ACTIVE, ACTIVE);
  for (const failure of [refusal(), {code: 'capture-call-active'}, {code: 'capture', reason: 'call-active'}, {recordingId: 'r', interrupted: 'call-active'}])
    assert.equal(P.callCaused(failure), true, JSON.stringify(failure));
  for (const failure of [null, undefined, 'call-active', Error('Voice stopped'), {code: 'capture', reason: 'paused'}, {code: 'audio-focus-lost'}, {recordingId: 'r', durationMs: 900}])
    assert.equal(P.callCaused(failure), false, JSON.stringify(failure));
  // The call screen's pause arrives as a plain capture loss: Telecom's reading says it was a call.
  assert.equal(P.voiceEndedForCall({code: 'capture', reason: 'paused'}, true), true);
  assert.equal(P.voiceEndedForCall({code: 'capture', reason: 'paused'}, false), false);
  assert.equal(P.voiceEndedForCall(refusal(), false), true);
});

test('the return notice is owed once, and only when a call was live as voice closed or since', () => {
  let now = 1000, seenAt = 0;
  const notice = P.createCallReturnNotice(time => seenAt >= time, () => now);
  assert.equal(notice.returned(), false, 'nothing closed');
  notice.closedByHide(false); now = 5000;
  assert.equal(notice.returned(), false, 'an app switch with no call says nothing');
  notice.closedByHide(true); now = 9000;
  assert.equal(notice.returned(), true, 'a call was live as voice closed');
  assert.equal(notice.returned(), false, 'said once');
  // The page hid first and Telecom reported the call after; the call ended before the return.
  notice.closedByHide(false); seenAt = now + 50; now += 4000;
  assert.equal(notice.returned(), true);
  // A call that ended before voice closed is not this close's cause.
  seenAt = now - 1; notice.closedByHide(false);
  assert.equal(notice.returned(), false);
});

test('Telecom readings record when a call was last live', async () => {
  globalThis.document = {hidden: false, addEventListener() {}, removeEventListener() {}};
  const listeners = [];
  let answer = {inCall: false, emergency: false, emergencyLive: false, watching: true};
  const plugin = {callState: async () => answer, addListener: async (_event, listener) => { listeners.push(listener); return {remove() {}}; }};
  const stop = C.watchCallState(plugin, () => {});
  await new Promise(resolve => setTimeout(resolve, 0));
  const before = Date.now();
  assert.equal(C.callSeenSince(before), false, 'no call has been read');
  listeners[0]({inCall: true, emergency: false, emergencyLive: false, watching: true});
  assert.equal(C.currentCallState().inCall, true);
  assert.equal(C.callSeenSince(before), true);
  // The call ends: the current reading no longer shows it, but it was live since `before`.
  listeners[0]({inCall: false, emergency: false, emergencyLive: false, watching: true});
  assert.equal(C.currentCallState().inCall, false);
  assert.equal(C.callSeenSince(before), true);
  assert.equal(C.callSeenSince(Date.now() + 60_000), false);
  // A read (the foreground refresh) counts as well as an event.
  stop();
  assert.equal(C.callSeenSince(0), false, 'a stopped watch has seen no call');
  answer = {inCall: true, emergency: false, emergencyLive: false, watching: true};
  const mark = Date.now();
  await C.readCallState(plugin);
  assert.equal(C.callSeenSince(mark), true);
  delete globalThis.document;
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
  const panel = () => f.renderChat();
  return {f, shell, clock, settle, panel,
    async start() { await shell.startVoice(); await settle(); },
    async speak() { f.peak = 0.5; await clock.advance(700); f.peak = 0; await clock.advance(1200); await settle(); },
    emit(name, value) { for (const callback of [...(f.events.get(name) || [])]) callback(value); }};
}

test('during a live call voice and dictation say so and open nothing', async () => {
  const s = surface(); s.f.inCall = true;
  await s.start();
  assert.equal(s.panel(), null, 'no voice panel opens');
  assert.equal(s.f.starts, 0, 'the microphone is not asked for');
  assert.deepEqual(s.shell.messages, [ACTIVE]);
  s.shell.startTranscription(); await s.settle();
  assert.equal(s.panel(), null);
  assert.deepEqual(s.shell.messages, [ACTIVE, ACTIVE]);
  // The call ends: voice starts as usual on the next request.
  s.f.inCall = false;
  await s.start();
  assert.equal(s.panel()?.state, 'listening');
  assert.equal(s.f.starts, 1);
});

test('a start the phone refuses for a call closes voice with one line, not a failure', async () => {
  // Telecom has not reported the call yet (or the call is another app's): only the native code says so.
  const s = surface(); s.f.startError = refusal();
  await s.start();
  assert.equal(s.panel(), null, 'no Voice stopped panel and no Try again into the call');
  assert.deepEqual(s.shell.messages, [ENDED]);
  s.f.startError = null;
  await s.clock.advance(5000); await s.settle();
  assert.equal(s.f.starts, 1, 'nothing retries on its own');
  await s.start();
  assert.equal(s.panel()?.state, 'listening');
});

test('a call that ends the capture closes voice with one line', async () => {
  const s = surface();
  await s.start();
  assert.equal(s.panel()?.state, 'listening');
  s.emit('recordingStopped', {recordingId: s.f.activeRecording, status: 'failed', interrupted: 'call-active'});
  await s.settle();
  assert.equal(s.panel(), null);
  assert.deepEqual(s.shell.messages, [ENDED]);
  assert.equal(s.f.uploads, 0, 'the cut clip is not sent');
  await s.clock.advance(5000); await s.settle();
  assert.equal(s.f.starts, 1, 'the microphone is not reopened');
});

test('a capture lost while Telecom reports a call is the call, whatever the native reason', async () => {
  // The call screen pauses Alpha before the audio mode changes: the capture ends without the call code.
  const s = surface();
  await s.start();
  s.f.inCall = true;
  s.emit('recordingStopped', {recordingId: s.f.activeRecording});
  await s.settle();
  assert.equal(s.panel(), null);
  assert.deepEqual(s.shell.messages, [ENDED]);
});

test('with no call a lost capture is still a voice failure the owner can retry', async () => {
  const s = surface();
  await s.start();
  s.emit('recordingStopped', {recordingId: s.f.activeRecording});
  await s.settle();
  const panel = s.panel();
  assert.equal(panel?.state, 'error');
  assert.deepEqual(texts(panel.statusLines), ['Voice stopped']);
  assert.equal(panel.recoveryLabel, 'Try again');
  assert.deepEqual(s.shell.messages, []);
});

test('the call screen hiding Alpha closes voice and says why once on return', async () => {
  const s = surface();
  await s.start();
  assert.equal(s.panel()?.state, 'listening');
  // Telecom reports the call, then the call screen covers the page.
  s.f.inCall = true; s.f.setHidden(true);
  await s.settle();
  assert.equal(s.f.activeRecording, null, 'the microphone closed');
  assert.deepEqual(s.shell.messages, [], 'nothing is said to a hidden page');
  // The call ends behind the call screen and Alpha shows again.
  s.f.inCall = false; s.f.setHidden(false);
  await s.settle();
  assert.equal(s.panel(), null, 'voice does not reopen on its own');
  assert.deepEqual(s.shell.messages, [ENDED]);
  s.f.setHidden(true); s.f.setHidden(false);
  assert.deepEqual(s.shell.messages, [ENDED], 'said once');
  await s.start();
  assert.equal(s.panel()?.state, 'listening', 'voice starts again when asked');
});

test('hiding Alpha with no call closes voice quietly', async () => {
  const s = surface();
  await s.start();
  s.f.setHidden(true); await s.settle(); s.f.setHidden(false); await s.settle();
  assert.equal(s.panel(), null);
  assert.deepEqual(s.shell.messages, []);
});

test('a dictation the phone refuses for a call says so instead of claiming something was saved', async () => {
  const s = surface(); s.f.startError = refusal();
  s.shell.startTranscription(); await s.settle();
  const panel = s.panel();
  assert.ok(panel, 'the dictation panel is open');
  await panel.stop(); await s.settle();
  assert.deepEqual(texts(s.panel().lines), [ACTIVE]);
});

test('a dictation clip a call cut short says so', async () => {
  const s = surface();
  s.shell.startTranscription(); await s.settle();
  await s.panel().stop(); await s.settle();
  assert.equal(s.panel().state, 'recording');
  s.emit('recordingStopped', {recordingId: s.f.activeRecording, status: 'failed', interrupted: 'call-active'});
  await s.settle();
  assert.deepEqual(texts(s.panel().lines), [ENDED]);
  // A clip lost while Telecom reports a call reads the same, without the native code.
  const t = surface();
  t.shell.startTranscription(); await t.settle();
  await t.panel().stop(); await t.settle();
  t.f.inCall = true;
  t.emit('recordingStopped', {recordingId: t.f.activeRecording});
  await t.settle();
  assert.deepEqual(texts(t.panel().lines), [ENDED]);
});

test('a spoken request that needs review keeps the microphone open and listening, not as a voice failure', async () => {
  // "Call Maya": the reply carries a proposal, so voice stays open for follow-up commands (VoiceTurnReview).
  const s = surface(); s.f.badReply = {complete: true, reviewRequired: true};
  await s.start(); await s.speak();
  const held = s.panel();
  assert.equal(held.state, 'listening', 'the conversation keeps listening after speaking');
  assert.equal(held.reviewHold, false);
  assert.equal(held.reviewAvailable, true);
  assert.equal(held.problem, false);
  assert.equal(held.muted, 'false');
  assert.equal(held.recoveryLabel, '');
  // A reply that failed is still a failure.
  const t = surface(); t.f.badReply = {complete: false};
  await t.start(); await t.speak();
  assert.equal(t.panel().state, 'error');
  assert.equal(t.panel().reviewHold, false);
  assert.deepEqual(texts(t.panel().statusLines), ['Voice stopped']);
});

test('a conversation in the pill continues in the sheet when a spoken request opens Phone or Home', async () => {
  // The fixture's speech port is the Cloud driver, which opens the sheet; the conversation is put in
  // the pill as on-device voice holds it. Phone and Home rest the chat on a bar and have no pill, and
  // the shell turns a pill request into the bar there (model.js shellDetent and goHome).
  const pill = async (rests, view = null) => {
    const s = surface(), shell = s.shell, openView = shell.openView.bind(shell), goHome = shell.goHome.bind(shell);
    shell.defaultChat = target => rests[target] || 'hidden';
    shell.openView = (target, patch, chat) => openView(target, patch, chat === 'hidden' && shell.defaultChat(target) === 'input' ? 'input' : chat);
    shell.goHome = chat => goHome(chat === 'sheet' || chat === 'full' ? chat : 'input');
    shell.state.view = view; shell.state.chat = 'hidden';
    await s.start();
    shell.state.chat = 'hidden'; await s.settle();
    assert.equal(s.panel()?.state, 'listening');
    return s;
  };
  const open = s => ['speaking', 'listening', 'preparing-speech'].includes(s.panel()?.state);
  const s = await pill({phone: 'input'});
  s.f.navigationTarget = 'phone';
  await s.speak();
  assert.equal(s.shell.state.view, 'phone');
  assert.equal(s.shell.state.chat, 'sheet', 'the conversation moved to the sheet');
  assert.equal(s.f.acks, 1);
  assert.ok(open(s), `voice is still open: ${s.panel()?.state}`);
  assert.deepEqual(s.shell.messages, []);
  // Leaving voice for the keyboard returns the chat to Phone's bar, never to a pill Phone lacks.
  s.panel().keyboard(); await s.settle(); await s.clock.advance(1000); await s.settle();
  assert.equal(s.panel(), null);
  assert.equal(s.shell.state.chat, 'input');
  // Home rests on its bar too.
  const h = await pill({}, 'calendar');
  h.f.navigationTarget = 'home';
  await h.speak();
  assert.equal(h.shell.state.view, null);
  assert.equal(h.shell.state.chat, 'sheet');
  assert.ok(open(h), `voice is still open at Home: ${h.panel()?.state}`);
  // A view with a pill keeps the pill.
  const t = await pill({});
  t.f.navigationTarget = 'calendar';
  await t.speak();
  assert.equal(t.shell.state.view, 'calendar');
  assert.equal(t.shell.state.chat, 'hidden');
  assert.ok(open(t), `voice is still open: ${t.panel()?.state}`);
});
