import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from './support/strip-types.mjs';
import vm from 'node:vm';

// The real on-device speech planner, and the real local-voice.ts over a closed native bridge.
function load(file, names, box) {
  const source = readFileSync(file, 'utf8').replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
  vm.runInNewContext('{' + stripTypeScriptTypes(source, {mode:'strip'}) + ';Object.assign(globalThis,{' + names.join(',') + '});}', box);
  return box;
}
const speechText = load('apps/app/src/ui/voice/speech-format.ts', ['formatSpeechText','SPEECH_CREDENTIAL_PATTERN'], {});
const {formatSpeechText,planLocalSpeech} = load('apps/app/src/runtime/local-speech-text.ts', ['planLocalSpeech'], speechText);
const listen = text => planLocalSpeech(text).join(' ');
const converse = text => planLocalSpeech(text, {mode: 'conversation'}).join(' ');
const refusal = (text, mode) => { try { planLocalSpeech(text, {mode}); return null; } catch (error) { return error; } };

test('times, money, ranges, phone numbers and dates read as a person says them', () => {
  for (const [text, spoken] of [
    ['Your meeting is at 3:30 PM.', 'Your meeting is at three thirty P M.'],
    ['Lunch at 7:00 then 9:05.', "Lunch at seven o'clock then nine oh five."],
    ['It starts at 3:00 PM.', 'It starts at three P M.'],
    ['That is $20 today.', 'That is 20 dollars today.'],
    ['It costs $12.50.', 'It costs 12 dollars 50.'],
    ['Only $1 or £5 or €2.5 now.', 'Only 1 dollar or 5 pounds or 2 euros 50 now.'],
    ['Paid $1,299 in all.', 'Paid 1299 dollars in all.'],
    ['Open 9-5 on weekdays.', 'Open 9 to 5 on weekdays.'],
    ['It takes 5-10 minutes.', 'It takes 5 to 10 minutes.'],
    ['Booked 9:30-10:00 today.', "Booked nine thirty to ten o'clock today."],
    ['Call 555-123-4567 later.', 'Call 555, 123, 4567 later.'],
    ['Due on 2026-11-06 at 10:30.', 'Due on 2026, 11, 06 at ten thirty.'],
  ]) {
    assert.equal(listen(text), spoken, text);
    assert.doesNotMatch(listen(text), /\b(?:dash|colon)\b/, text);
  }
});

test('on-device replies turn abbreviated dates and times into speech', () => {
  assert.equal(converse('Availability: Sun, Nov 22, 12:00 PM - 12:30 PM.'), 'Availability, Sunday, November twenty second, noon to twelve thirty P M.');
  assert.equal(converse('Sun Microsystems. Deadline: Sept. 1 at 9:05 a.m.'), 'Sun Microsystems. Deadline, September first at nine oh five A M.');
});

test('speech formatting handles clock syntax without rewriting other numeric display data', () => {
  assert.equal(formatSpeechText('Times: 2-3 p.m., 09:05–10:00, 18:30 to 19:00.'), "Times, two to three P M, nine oh five to ten o'clock, six thirty P M to seven P M.");
  assert.equal(formatSpeechText('2% of $1,299.50. Ratio 2:10. Call 415-555-0100 on 2026-11-21. UTC+01:00.'), '2 percent of $1,299.50. Ratio 2:10. Call 415-555-0100 on 2026-11-21. UTC+01:00.');
});

test('bullets and quotes are read without spoken labels, and each bullet stays its own sentence', () => {
  assert.equal(listen('Shopping list\n- milk\n- eggs!\n* bread\n> Bring bags\nThanks'), 'Shopping list milk. eggs! bread. Bring bags Thanks');
  assert.doesNotMatch(listen('- one\n- two'), /Item|Quote/);
});

test('conversation folds accents, slashes and web prefixes; Listen still refuses them', () => {
  assert.equal(converse('Café Luna and/or José.'), 'Cafe Luna and or Jose.');
  assert.equal(converse('See www.cafe.example for the menu.'), 'See cafe.example for the menu.');
  assert.equal(converse('Say こんにちは to Ana.'), 'Say to Ana.');
  assert.equal(planLocalSpeech('こんにちは', {mode: 'conversation'}).length, 0, 'nothing sayable plans silence, not a failure');
  assert.equal(refusal('Café Luna', 'listen').message, "This message has characters that can't be read aloud.");
  assert.equal(refusal('Open www.cafe.example', 'listen').message, "This message has a link or email address, so it can't be read aloud.");
  assert.equal(refusal('Café Luna and/or José.', 'conversation'), null);
});

test('a credential is refused as a whole reply in conversation, with its own code', () => {
  for (const text of ['Your wifi password is: hunter2', 'The secret: abc', 'Card 4111 1111 1111 1111 on file.']) {
    const error = refusal(formatSpeechText(text), 'conversation');
    assert.equal(error?.code, 'speech-refused', text);
  }
  // A value split from its label by the sentence splitter is still caught on the whole reply.
  assert.equal(refusal('Here it is. Your password is: hunter2. Keep it safe.', 'conversation')?.code, 'speech-refused');
  assert.equal(refusal('Your wifi password is: hunter2', 'listen').message, "This message may contain a password or code, so it can't be read aloud.");
});

function onDevice({text = '', execution = 'device'} = {}) {
  const f = {synthesized: []}, listeners = new Map();
  const native = {
    addListener: async (event, callback) => { listeners.set(event, callback); return {remove: async () => {}}; },
    synthesizeLocal: async input => { f.synthesized.push(input.text); return {playbackId: 'owned-' + f.synthesized.length, execution: 'device'}; },
    play: async ({playbackId}) => { setTimeout(() => listeners.get('playbackEnded')?.({playbackId}), 0); }, cancel: async () => {}, stopPlayback: async () => {}, releaseLocalSpeech: async () => {},
    transcribeLocalRecording: async () => ({text, local: true, execution}),
  };
  const box = {AbortController, DOMException, crypto, console, setTimeout, clearTimeout, planLocalSpeech, nativeVoiceTurnId: () => undefined,
    Capacitor: {isNativePlatform: () => true, isPluginAvailable: () => true}, registerPlugin: () => native,
    connectionController: {getSnapshot: () => ({}), getCloudClient: () => null, subscribe: () => () => {}},
    document: {hidden: false, documentElement: {dataset: {}}, addEventListener() {}, removeEventListener() {}}};
  load('.eliza/client-features/packages/voice/src/native-speech-request.ts', ['createNativeSpeechRequests'], box);
  load('apps/app/src/local-speech-playback.ts', ['speakLocalText'], box);
  load('apps/app/src/runtime/local-voice.ts', ['createOnDeviceVoice'], box);
  return {f, voice: box.createOnDeviceVoice()};
}

test('on-device conversation speech folds what it can and resolves silence for nothing sayable', async () => {
  const {f, voice} = onDevice();
  let started = 0;
  await voice.speak('Café Luna opens at 9:30.', new AbortController().signal, () => started++, false, {conversation: true});
  assert.deepEqual(f.synthesized, ['Cafe Luna opens at nine thirty.'], 'the native Listen re-plan accepts a planned chunk');
  await voice.speak('こんにちは', new AbortController().signal, () => started++, false, {conversation: true});
  assert.equal(f.synthesized.length, 1);
  assert.equal(started, 2, 'an unsayable sentence counts as played silence');
  await assert.rejects(voice.speak('Café', new AbortController().signal), /can't be read aloud/, 'Listen keeps every refusal');
  await assert.rejects(voice.speak('The password is: hunter2', new AbortController().signal, undefined, false, {conversation: true}), {code: 'speech-refused'});
  assert.equal(f.synthesized.length, 1);
});

test('a silent on-device recording reports no speech; a wrong engine stays a generic failure', async () => {
  await assert.rejects(onDevice({text: '  '}).voice.transcribe('clip', new AbortController().signal), {code: 'no-speech', message: 'No speech was detected.'});
  const wrong = await onDevice({text: '', execution: 'browser'}).voice.transcribe('clip', new AbortController().signal).then(() => null, error => error);
  assert.equal(wrong.message, 'No usable on-device transcript');
  assert.equal(wrong.code, undefined);
});
