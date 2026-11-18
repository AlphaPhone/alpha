// Actual Notes recorder session and Cloud speech driver, with in-memory native ports.
import assert from 'node:assert/strict';
import type {NoteRecordingStatus, NoteRecorderSession, SavedNoteAudio} from '../apps/app/src/prototype/note-recorder.ts';
import {cloudVoiceViewFixture} from '../test/fixtures/cloud-voice-view.mjs';

const recordingId = '11111111-2222-4333-8444-555555555555';
const segmentId = recordingId + '-s0';
let recording: NoteRecordingStatus = {state:'idle'};
type RecordingFixture = NonNullable<NonNullable<Parameters<typeof cloudVoiceViewFixture>[0]>['noteRecording']>;
const noteRecording: RecordingFixture = driver => ({
  async startNoteRecording(binding) {
    recording = {state:'recording', recordingId, binding, durationMs:1000, segments:[{segmentId,durationMs:1000}]};
    return structuredClone(recording);
  },
  async noteRecordingStatus() { return structuredClone(recording); },
  async stopNoteRecording(input) {
    assert.equal(input.recordingId, recordingId);
    recording.state = 'stopped';
    return structuredClone(recording);
  },
  async setNoteSegmentText(input) {
    assert.equal(input.recordingId, recordingId);
    assert.equal(input.segmentId, segmentId);
    assert.ok(recording.segments?.[0]);
    recording.segments[0].text = input.text;
  },
  saveNoteRecording: input => driver.saveRecording(input),
  async discardNoteRecording() { recording = {state:'idle'}; return recording; },
});
// Keep the explicit remote-transcription contract covered separately from the audio-only renderer.
// This is the actual session and actual Cloud driver, not a removed recorder UI control.
const consentFixture = cloudVoiceViewFixture({cloudProfile:true,noteRecording});
let consent: NoteRecorderSession | undefined;
try {
  consent = new consentFixture.box.NoteRecorderSession(consentFixture.box.createNoteRecorderDriver(), async () => {
    const route = await consentFixture.box.noteSegmentTranscriber(new AbortController().signal, 'cloud');
    assert.ok(route);
    return route.transcribe;
  }, () => {}, {pollMs:60_000,remoteTranscription:()=>true,owner:()=>({identity:'explicit-transcription-fixture',folderId:null,current:()=>true})});
  await consent.begin();
  assert.equal(consentFixture.uploads, 0);
  assert.equal(await consent.finish(async () => assert.fail('Stop must precede remote transcription'), true, true), false);
  assert.equal(await consent.stop(), true);
  assert.equal(consent.needsTranscriptionConsent, true);
  assert.equal(await consent.finish(async () => assert.fail('Remote consent is required')), false);
  assert.equal(consentFixture.uploads, 0);
  assert.equal(await consent.finish(async () => false, true, true), false, 'Failed local persistence retains the approved transcript');
  assert.equal(consentFixture.uploads, 1);
  assert.equal(consentFixture.transcribeInput?.recordingId, segmentId);
  assert.equal(consentFixture.transcribeInput?.credentialId, 'cloud-credential');
  assert.equal(consent.transcript(), 'Synthetic Cloud transcript');
  assert.equal(consent.phase, 'stopped');
  const saved: {audio: SavedNoteAudio; transcript: string}[] = [];
  assert.equal(await consent.finish(async (audio, transcript) => {saved.push({audio, transcript}); return true;}), true);
  assert.equal(saved[0]?.transcript, 'Synthetic Cloud transcript');
  assert.equal(saved[0]?.audio.transcript, 'Synthetic Cloud transcript');
  assert.equal(consentFixture.uploads, 1, 'Retrying a local save must send no additional audio');
  assert.equal(consentFixture.sends, 0);
} finally {
  consent?.close();
  consentFixture.close();
}
console.log('PASS Explicit Cloud transcription still requires consent after Stop and retries only local save.');
