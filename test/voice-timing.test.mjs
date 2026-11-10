import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const store = new Map();
globalThis.localStorage = {getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k)};
const timing = await import('../apps/app/src/runtime/voice-timing.ts');
const {aggregate, percentile} = await import('../scripts/aggregate-voice-latency.mjs');
let now = 0;
timing.setVoiceTimingClock(() => now);

function turn({cold = false, route = 'on-device', recognition = 800, review = 3000, token = 600, reply = 1500, audio = 2100, speak = true} = {}) {
  now = 10_000;
  const id = timing.beginVoiceTurn({route, cold});
  now += recognition; assert.equal(timing.markVoiceTiming('transcript-ready'), true);
  now += review; assert.equal(timing.markVoiceTiming('send'), true);
  now += token; assert.equal(timing.markVoiceTiming('first-token'), true);
  now += reply - token; assert.equal(timing.markVoiceTiming('final-reply'), true);
  if (speak) { now += audio - reply; assert.equal(timing.markVoiceTiming('first-audio'), true); } else timing.finishVoiceTurn();
  return id;
}

test('a turn records ordered offsets once and never stores text or account identifiers', () => {
  timing.clearVoiceTiming();
  const id = turn();
  const [row] = timing.voiceTimingRecords();
  assert.equal(row.id, id);
  assert.deepEqual(row.marks, {'recording-end': 0, 'transcript-ready': 800, send: 3800, 'first-token': 4400, 'final-reply': 5300, 'first-audio': 5900});
  assert.deepEqual(Object.keys(row).sort(), ['cold', 'id', 'marks', 'recordedAt', 'route', 'version']);
  // The turn ended at first audio: later marks are ignored.
  assert.equal(timing.markVoiceTiming('first-token'), false);
  const exported = JSON.parse(timing.exportVoiceTiming());
  assert.equal(exported.format, 'alpha-voice-timing-v1');
  assert.doesNotMatch(timing.exportVoiceTiming(), /session|credential|owner|text/i);
});

test('out-of-order and premature marks cannot shorten a phase', () => {
  timing.clearVoiceTiming();
  now = 0; timing.beginVoiceTurn({route: 'browser', cold: true});
  assert.equal(timing.markVoiceTiming('send'), false, 'send needs a ready transcript');
  assert.equal(timing.markVoiceTiming('first-token'), false, 'reply marks need send');
  now = 500; assert.equal(timing.markVoiceTiming('transcript-ready'), true);
  assert.equal(timing.markVoiceTiming('transcript-ready'), false, 'first mark wins');
  assert.equal(timing.markVoiceTiming('send', 'another-turn'), false);
  assert.equal(timing.beginVoiceTurn({route: 'unknown-route', cold: false}), undefined);
  // The unknown route abandoned the earlier turn without recording a new one.
  const rows = timing.voiceTimingRecords();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].outcome, 'abandoned');
});

test('legacy renderer samples remain diagnostic and cannot qualify native audio latency', () => {
  timing.clearVoiceTiming();
  for (let i = 0; i < 19; i++) turn({recognition: 700 + i, audio: 2000 + i});
  for (let i = 0; i < 5; i++) turn({cold: true, recognition: 4000 + i});
  turn({speak: false});
  now = 0; timing.beginVoiceTurn({route: 'on-device', cold: false}); timing.abandonVoiceTurn();
  const exported = JSON.parse(timing.exportVoiceTiming());
  const summary = aggregate([exported, exported]);
  assert.equal(summary.records, 26, 'duplicates across exports are counted once');
  assert.equal(summary.abandoned, 1);
  assert.equal(summary.cohorts.warm.samples, 20);
  assert.equal(summary.cohorts.cold.samples, 5);
  assert.equal(summary.sufficient, false);
  assert.equal(summary.legacyDiagnosticsSufficient, true);
  assert.equal(summary.cohorts.warm.withAudio, 19);
  assert.equal(summary.cohorts.cold.phases.recognition.p50, 4002);
  assert.equal(summary.cohorts.warm.phases.speechToAudioExcludingReview.n, 19);
  assert.equal(summary.cohorts.warm.phases.review.p50, 3000);
  assert.match(summary.targetSignOff, /Issue #395/);
  assert.equal(percentile([1, 2, 3, 4], 50), 2);
  // The command reports insufficiency with exit code 2.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'voice-latency-'));
  try {
    const file = path.join(dir, 'export.json');
    fs.writeFileSync(file, JSON.stringify({...exported, records: exported.records.slice(0, 10)}));
    assert.throws(() => execFileSync(process.execPath, ['scripts/aggregate-voice-latency.mjs', file], {stdio: 'pipe'}), error => error.status === 2);
    fs.writeFileSync(file, JSON.stringify(exported));
    assert.throws(() => execFileSync(process.execPath, ['scripts/aggregate-voice-latency.mjs', file], {stdio: 'pipe'}), error => error.status === 2 && JSON.parse(error.stdout).legacyDiagnosticsSufficient === true);
    // The required counts can be raised but never lowered below 20 warm and 5 cold.
    assert.throws(() => execFileSync(process.execPath, ['scripts/aggregate-voice-latency.mjs', file, '--warm', '1'], {stdio: 'pipe'}), error => error.status === 1);
    assert.throws(() => execFileSync(process.execPath, ['scripts/aggregate-voice-latency.mjs', file, '--cold', '30'], {stdio: 'pipe'}), error => error.status === 2);
    assert.equal(aggregate([exported], {warm: 1, cold: 1}).cohorts.warm.required, 20);
    fs.writeFileSync(file, '{"format":"other"}');
    assert.throws(() => execFileSync(process.execPath, ['scripts/aggregate-voice-latency.mjs', file], {stdio: 'pipe'}), error => error.status === 1);
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});

test('marks do no storage work: the clock is read first and a whole turn is written by one deferred write', () => {
  timing.clearVoiceTiming();
  const calls = {get: 0, set: 0};
  const original = globalThis.localStorage;
  // Reading storage costs time on this clock, as parsing a large record list does on a phone.
  globalThis.localStorage = {
    getItem: key => { calls.get++; now += 40; return original.getItem(key); },
    setItem: (key, value) => { calls.set++; now += 40; original.setItem(key, value); },
    removeItem: key => original.removeItem(key),
  };
  try {
    now = 50_000;
    const id = timing.beginVoiceTurn({route: 'on-device', cold: false, entry: 'conversation', policy: 'auto-send'});
    now += 700; assert.equal(timing.markVoiceTiming('transcript-ready'), true);
    assert.equal(timing.recordEndpointVoiceTiming({by: 'gap', semantic: 'not-asked'}), true);
    assert.equal(timing.recordLiveVoiceTiming({mode: 'stream', partials: 3}), true);
    now += 10; assert.equal(timing.markVoiceTiming('send'), true);
    now += 500; assert.equal(timing.markVoiceTiming('first-token'), true);
    now += 900; assert.equal(timing.markVoiceTiming('final-reply'), true);
    now += 300; assert.equal(timing.markVoiceTiming('first-audio'), true);
    assert.deepEqual(calls, {get: 0, set: 0}, 'no storage read, parse or write on the turn path');
    timing.flushVoiceTiming();
    assert.deepEqual(calls, {get: 1, set: 1}, 'one read and one write for the whole turn');
    timing.flushVoiceTiming();
    assert.deepEqual(calls, {get: 1, set: 1}, 'nothing pending, nothing written');
    const row = timing.voiceTimingRecords().find(item => item.id === id);
    assert.deepEqual(row.marks, {'recording-end': 0, 'transcript-ready': 700, send: 710, 'first-token': 1210, 'final-reply': 2110, 'first-audio': 2410}, 'offsets hold only the time between marks');
    assert.deepEqual(row.endpoint, {by: 'gap', semantic: 'not-asked'});
    assert.deepEqual(row.live, {mode: 'stream', partials: 3});
    // A late outcome for a finished turn updates the same record.
    assert.equal(timing.recordHeardVoiceTiming(id, 'recorded'), true);
    assert.equal(timing.recordHeardVoiceTiming(id, 'conflict'), false);
    assert.equal(timing.voiceTimingRecords().find(item => item.id === id).heard, 'recorded');
    assert.equal(timing.voiceTimingRecords().filter(item => item.id === id).length, 1);
  } finally { globalThis.localStorage = original; }
});

test('a turn is written when it ends, and readers always see pending records', async () => {
  timing.clearVoiceTiming();
  now = 80_000;
  const first = timing.beginVoiceTurn({route: 'on-device', cold: true});
  now += 100; timing.markVoiceTiming('transcript-ready');
  assert.equal(store.has('alphaphone:voice-timing:v1'), false, 'an open turn is not written on the mark path');
  const second = timing.beginVoiceTurn({route: 'on-device', cold: false});
  assert.deepEqual(JSON.parse(store.get('alphaphone:voice-timing:v1')).map(row => row.outcome), ['abandoned'], 'an abandoned turn is written when it ends');
  const rows = timing.voiceTimingRecords();
  assert.deepEqual(rows.map(row => [row.id, row.outcome]), [[first, 'abandoned'], [second, undefined]]);
  assert.equal(JSON.parse(timing.exportVoiceTiming()).records.length, 2);
  timing.clearVoiceTiming();
  assert.deepEqual(timing.voiceTimingRecords(), [], 'clearing also drops records that were not written yet');
  const third = timing.beginVoiceTurn({route: 'on-device', cold: false});
  assert.equal(store.has('alphaphone:voice-timing:v1'), false);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.deepEqual(JSON.parse(store.get('alphaphone:voice-timing:v1')).map(row => row.id), [third], 'pending records are written in a later task without a reader');
  timing.clearVoiceTiming();
});
