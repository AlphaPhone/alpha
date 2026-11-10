import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';

// Dictation over the native live capture (apps/app/src/runtime/native-live-voice.ts): a Stop whose
// native close fails must not leave the recorder reporting that it is still recording.
async function load(captures) {
  const plugin = {async liveCaptureStatus() { return {available: true, nativeTransport: true}; }};
  const binding = {ownerId: 'owner', sessionId: 'session'};
  globalThis.__alphaDictationFixture = {
    Capacitor: {isNativePlatform: () => true, isPluginAvailable: () => true}, registerPlugin: () => plugin,
    connectionController: {getResidentLiveVoice: () => ({sessionId: 'session', request: async () => ({})}), getResidentReadingBinding: () => binding},
    createLiveSegmentStream: () => { throw Error('the compatibility path is not used'); },
    openNativeResidentCapture: async (_port, input) => { const capture = captures.shift()(input); return capture; },
    LIVE_ASR_PATH: '/live', LIVE_ASR_STATUS_PATH: '/status',
  };
  const source = fs.readFileSync(new URL('../apps/app/src/runtime/native-live-voice.ts', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
  const prefix = 'const {Capacitor,registerPlugin,connectionController,createLiveSegmentStream,openNativeResidentCapture,LIVE_ASR_PATH,LIVE_ASR_STATUS_PATH}=globalThis.__alphaDictationFixture;\n';
  return import('data:text/javascript;base64,' + Buffer.from(prefix + stripTypeScriptTypes(source) + `\n// ${Math.random()}`).toString('base64'));
}
const failing = log => input => ({startedAt: 0, echoCancelled: false, speaking: () => false,
  close: async () => { input.onSegment('words before the failed stop'); throw Error('Native transcription close was not confirmed.'); },
  cancel: async () => { log.cancelled++; }, signal: (log.signal = input.signal)});
const working = () => input => ({startedAt: 0, echoCancelled: false, speaking: () => false,
  close: async () => { input.onSegment('second attempt'); return {durationMs: 1200}; }, cancel: async () => {}});

test('a Stop whose native close fails releases the recording so Transcribe can start again', async () => {
  try {
    const log = {cancelled: 0};
    const module = await load([failing(log), working()]);
    const dictation = module.createNativeLiveDictation();
    const first = await dictation.startRecording();
    await assert.rejects(dictation.stopRecording(), /not confirmed/);
    assert.equal(log.signal.aborted, true, 'the capture that did not stop is discarded');
    await assert.rejects(dictation.transcribe(first.recordingId, new AbortController().signal), /no longer available/, 'nothing from the failed recording is transcribed');
    const second = await dictation.startRecording();
    assert.notEqual(second.recordingId, first.recordingId);
    const clip = await dictation.stopRecording();
    assert.deepEqual(clip, {recordingId: second.recordingId, durationMs: 1200});
    assert.deepEqual(await dictation.transcribe(second.recordingId, new AbortController().signal), {text: 'second attempt', local: true});
  } finally { delete globalThis.__alphaDictationFixture; }
});

test('the maximum-duration stop that fails reports a lost clip and releases the recording', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  try {
    const log = {cancelled: 0};
    const module = await load([failing(log), working()]);
    const dictation = module.createNativeLiveDictation({maxDurationMs: 1000});
    const clips = [];
    await dictation.addListener('recordingStopped', clip => clips.push(clip));
    const first = await dictation.startRecording();
    t.mock.timers.tick(1000);
    for (let i = 0; i < 20; i++) await Promise.resolve();
    assert.equal(clips.length, 1);
    assert.equal(clips[0].recordingId, first.recordingId);
    assert.ok(Number.isNaN(clips[0].durationMs));
    await dictation.startRecording();
  } finally { delete globalThis.__alphaDictationFixture; }
});
