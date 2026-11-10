import test from 'node:test';
import assert from 'node:assert/strict';

// Voice assistant controller (apps/app/src/runtime/voice-assistant.ts): speech that plays while the
// reply still streams, the owner-input pause, and a capture that fails to close.
const {VoiceAssistantSession, ASSISTANT_TIMING_DEFAULTS, audible, heardSplit, remainingSentences} = await import('../apps/app/src/runtime/voice-assistant.ts');

const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); promise.catch(() => {}); return {promise, resolve, reject}; }
function fakeClock() {
  let now = 0, id = 0;
  const timers = new Map();
  return {
    now: () => now,
    setTimer: (callback, ms) => { const handle = ++id; timers.set(handle, {at: now + ms, callback}); return handle; },
    clearTimer: handle => { timers.delete(handle); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        const next = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        timers.delete(next[0]); now = next[1].at; next[1].callback();
        await flush();
      }
      now = end; await flush();
    },
  };
}
function harness(options = {}) {
  const clock = fakeClock();
  const log = {sends: [], heard: [], gate: [], captures: [], states: []};
  const mics = [], replies = [], speeches = [];
  const ports = {
    conversationId: 'room-1',
    assertCurrent() {},
    listen: async handlers => {
      const index = mics.length; mics.push(handlers);
      const capture = {index, cancelled: 0, closed: 0};
      log.captures.push(capture);
      const hold = options.holdOpen?.[index];
      if (hold) await hold.promise;
      return {fullDuplex: true, close: async () => { capture.closed++; if (options.closeFails) throw Error('Native transcription close was not confirmed.'); }, cancel: () => { capture.cancelled++; }};
    },
    shouldRespond: (text, context) => { log.gate.push({text, ...context}); return options.shouldRespond ? options.shouldRespond(text, context) : true; },
    send: input => {
      log.sends.push(input.text);
      const reply = deferred(); replies.push({input, reply});
      input.signal.addEventListener('abort', () => reply.reject(new DOMException('cancelled', 'AbortError')), {once: true});
      return reply.promise;
    },
    speak: input => {
      const done = deferred(); speeches.push({input, done});
      input.signal.addEventListener('abort', () => done.reject(new DOMException('stopped', 'AbortError')), {once: true});
      return done.promise;
    },
    onHeard: value => log.heard.push(value),
    onState: value => log.states.push(value),
  };
  const session = new VoiceAssistantSession(ports, {clock});
  const mic = () => mics.at(-1);
  return {
    clock, log, session, replies, speeches, mics, mic,
    answer(index, text, extra = {}) { const {input, reply} = replies[index]; reply.resolve({requestId: input.turnId, conversationId: 'room-1', userMessageId: `u-${index}`, assistantMessageId: `a-${index}`, text, complete: true, ...extra}); },
    async say(text, durationMs = 400) { mic().onSpeechStart(clock.now()); await flush(); await clock.advance(durationMs); mic().onSpeechEnd(clock.now()); await flush(); mic().onSegment(text); await flush(); },
    phase: () => session.getSnapshot().phase,
    live: () => log.captures.filter(capture => !capture.cancelled && !capture.closed).length,
  };
}
const FIRST = 'How about a simple pasta with garlic and lemon?';

test('pure accounting: audible text, the heard split and the sentences a confirmed reply still supplies', () => {
  assert.equal(audible({sentences: ['One.', 'Two.', 'Three.'], played: 1, started: true}), 'One. Two.');
  assert.equal(audible({sentences: ['One.'], played: 0, started: false}), '');
  assert.deepEqual(heardSplit({sentences: ['One.', 'Two.', 'Three.'], played: 1, base: 0}), {heard: 'One.', unheard: 'Two. Three.'});
  assert.deepEqual(heardSplit({sentences: ['Before.', 'One.', 'Two.'], played: 2, base: 1}), {heard: 'One.', unheard: 'Two.'}, 'sentences of an earlier message are not part of the reply');
  assert.deepEqual(heardSplit({sentences: ['Before.', 'One.'], played: 0, base: 1}), {heard: '', unheard: 'One.'});
  assert.deepEqual(remainingSentences(['A.'], ['A.', 'B.'], false), ['B.']);
  assert.deepEqual(remainingSentences(['X.'], ['A.', 'B.'], false), ['B.'], 'a contradicted stream keeps its count');
  assert.deepEqual(remainingSentences(['X.'], ['A.'], true), ['A.'], 'a resumed reply is spoken in full');
  assert.deepEqual(remainingSentences([], ['A.'], true), ['A.']);
});

test('echo of a sentence that plays while the reply still streams is gated against that sentence and is not a turn', async () => {
  const h = harness({shouldRespond: (text, context) => !(context.agentSpeaking && context.recentAgentReply.toLowerCase().includes(text.toLowerCase()))});
  await h.session.start();
  await h.say('what should I cook tonight');
  await h.clock.advance(ASSISTANT_TIMING_DEFAULTS.longGapMs);
  h.replies[0].input.onText(`${FIRST} It takes twenty`);
  await flush();
  h.speeches[0].input.onStarted();
  await flush();
  assert.equal(h.phase(), 'speaking');
  await h.say('a simple pasta with garlic and lemon');
  const gate = h.log.gate.at(-1);
  assert.equal(gate.agentSpeaking, true);
  assert.equal(gate.recentAgentReply, FIRST, 'the gate sees the streamed sentence being played');
  assert.equal(h.replies[0].input.signal.aborted, false, 'the echo does not interrupt the reply');
  assert.equal(h.phase(), 'speaking');
  assert.equal(h.log.sends.length, 1);
});

test('an interruption before the reply is confirmed reports what was played under the turn id and remembers it as recently spoken', async () => {
  const h = harness();
  await h.session.start();
  await h.say('what should I cook tonight');
  await h.clock.advance(ASSISTANT_TIMING_DEFAULTS.longGapMs);
  const {input} = h.replies[0];
  input.onText(`${FIRST} It takes twenty minutes and uses pantry staples. And then`);
  await flush();
  h.speeches[0].input.onStarted();
  h.speeches[0].done.resolve();
  await flush();
  assert.equal(h.speeches.length, 2);
  assert.equal(h.session.interruptSpeech(), true);
  await flush();
  assert.deepEqual(h.log.heard, [{turnId: input.turnId, replyId: '', heard: FIRST, unheard: 'It takes twenty minutes and uses pantry staples.', interrupted: true}]);
  await h.say('something new');
  assert.equal(h.log.gate.at(-1).recentAgentReply, `${FIRST} It takes twenty minutes and uses pantry staples.`, 'the next segment is gated against the interrupted speech');
  assert.equal(h.log.gate.at(-1).agentSpeaking, false);

  const silent = harness();
  await silent.session.start();
  await silent.say('hello there');
  await silent.clock.advance(ASSISTANT_TIMING_DEFAULTS.longGapMs);
  await silent.session.stop();
  assert.deepEqual(silent.log.heard, [], 'nothing audible, nothing reported');
});

const pauseExtra = {complete: false, awaitingUserInput: {proposalId: 'p-1', digest: 'd-1'}};
const resumeWith = (h, text) => {
  const pause = h.session.getSnapshot().awaitingUserInput;
  return h.session.resume({pause, reply: {requestId: pause.requestId, conversationId: 'room-1', userMessageId: pause.userMessageId, assistantMessageId: 'a-resumed', text, complete: true}});
};

test('a resumed reply is spoken in full after sentences streamed before the pause, and heard accounting covers only the resumed reply', async () => {
  const h = harness();
  await h.session.start();
  await h.say('summarize my packing note');
  await h.clock.advance(ASSISTANT_TIMING_DEFAULTS.longGapMs);
  h.replies[0].input.onText('Let me look at your packing note. One moment');
  await flush();
  h.speeches[0].input.onStarted();
  h.speeches[0].done.resolve();
  await flush();
  h.answer(0, 'Let me look at your packing note. Share the note?', pauseExtra);
  await flush();
  assert.equal(h.phase(), 'awaiting-user-input');
  assert.equal(resumeWith(h, 'Passport, charger and boots.'), true);
  await flush();
  assert.deepEqual(h.speeches.map(s => s.input.text), ['Let me look at your packing note.', 'Passport, charger and boots.'], 'the single resumed sentence is not dropped');
  h.speeches[1].done.resolve();
  await flush();
  assert.equal(h.phase(), 'listening');
  assert.deepEqual(h.log.heard.map(({replyId, heard, unheard, interrupted}) => ({replyId, heard, unheard, interrupted})), [{replyId: 'a-resumed', heard: 'Passport, charger and boots.', unheard: '', interrupted: false}]);
});

test('an unmute in flight when the owner-input pause begins never leaves the microphone open', async () => {
  const second = deferred();
  const h = harness({holdOpen: {1: second}});
  await h.session.start();
  await h.say('summarize my packing note');
  await h.clock.advance(ASSISTANT_TIMING_DEFAULTS.longGapMs);
  await h.session.setMuted(true);
  const unmuting = h.session.setMuted(false);
  await flush();
  assert.equal(h.mics.length, 2, 'the unmute is opening a capture');
  h.answer(0, 'Share the note?', pauseExtra);
  await flush();
  assert.equal(h.phase(), 'awaiting-user-input');
  second.resolve(); await unmuting; await flush();
  assert.equal(h.live(), 0, 'the capture that arrives during the pause is cancelled');
  assert.equal(h.log.captures[1].cancelled, 1);
  // Speech on the retired capture is never a barge-in that aborts the pause.
  h.mics[1].onSpeechStart(h.clock.now()); await h.clock.advance(ASSISTANT_TIMING_DEFAULTS.bargeInConfirmMs + 100);
  assert.equal(h.phase(), 'awaiting-user-input');
  assert.equal(resumeWith(h, 'Passport, charger and boots.'), true);
  await flush();
  assert.equal(h.mics.length, 3, 'listening resumes with one new capture');
  assert.equal(h.live(), 1);
});

test('an unmute made while the pause is cancelling the capture does not reopen the microphone', async () => {
  const h = harness();
  await h.session.start();
  await h.say('summarize my packing note');
  await h.clock.advance(ASSISTANT_TIMING_DEFAULTS.longGapMs);
  await h.session.setMuted(true);
  h.answer(0, 'Share the note?', pauseExtra);
  // Before the reply is processed far enough to publish the pause.
  await Promise.resolve(); await Promise.resolve();
  const unmuting = h.session.setMuted(false);
  await unmuting; await flush();
  assert.equal(h.phase(), 'awaiting-user-input');
  assert.equal(h.live(), 0);
});

test('Stop speaking during the pause ends it and listening resumes on a new capture', async () => {
  const h = harness();
  await h.session.start();
  await h.say('summarize my packing note');
  await h.clock.advance(ASSISTANT_TIMING_DEFAULTS.longGapMs);
  h.replies[0].input.onText('Let me look at your packing note. One moment');
  await flush();
  h.speeches[0].input.onStarted();
  await flush();
  h.answer(0, 'Let me look at your packing note. Share the note?', pauseExtra);
  await flush();
  assert.equal(h.phase(), 'awaiting-user-input');
  assert.equal(h.live(), 0);
  assert.equal(h.session.interruptSpeech(), true);
  await flush();
  assert.equal(h.phase(), 'listening');
  assert.equal(h.live(), 1, 'the pause no longer blocks the microphone');
  await h.say('never mind');
  await h.clock.advance(ASSISTANT_TIMING_DEFAULTS.longGapMs);
  assert.deepEqual(h.log.sends, ['summarize my packing note', 'never mind']);
});

test('a capture that fails to close on mute does not strand the utterance: later speech is still submitted', async () => {
  const h = harness({closeFails: true});
  await h.session.start();
  h.mic().onSpeechStart(h.clock.now()); await h.clock.advance(300);
  h.mic().onSpeechEnd(h.clock.now()); await flush();
  // The final for this segment never arrives: the close failed.
  await h.session.setMuted(true);
  await h.session.setMuted(false);
  await flush();
  assert.equal(h.mics.length, 2);
  await h.say('set a timer for ten minutes');
  await h.clock.advance(ASSISTANT_TIMING_DEFAULTS.longGapMs);
  assert.deepEqual(h.log.sends, ['set a timer for ten minutes']);
});
