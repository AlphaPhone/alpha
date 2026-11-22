import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {replayPhotosAgentHost} from '../specs/quint/refinement/application/photos-agent-host.mjs';

const adapter = 'prototype/photo-library-adapter.ts';
test('the Photos host item requests follow the sampled PhotosAgentHost steps', {timeout: scaledTimeout(240000)}, async () => {
  const receipt = await replayPhotosAgentHost({traces: 300, maxSteps: 24});
  assert.equal(receipt.traces, 306);
  assert.ok(receipt.steps > 2000, JSON.stringify(receipt));
  for (const action of ['request', 'settle', 'libraryReviewOpens', 'hide', 'leave', 'busyStarts', 'remove']) assert.ok(receipt.actions[action] > 0, action);
});
test('a request that acts after its visit ended is rejected by the replay', {timeout: scaledTimeout(240000)}, async () => {
  await assert.rejects(replayPhotosAgentHost({traces: 60, maxSteps: 24, rewrite: {[adapter]: text =>
    text.replace("if (!ports.current()) throw new LibraryAgentRefusal('Open Photos, then ask again.');", '')}}), /trace \d+ step \d+ settle/);
});
test('an album review opened beside the library review is rejected by the replay', {timeout: scaledTimeout(240000)}, async () => {
  await assert.rejects(replayPhotosAgentHost({traces: 60, maxSteps: 24, rewrite: {[adapter]: text =>
    text.replace("if (ports.reviewOpen()) throw new LibraryAgentRefusal('Finish the open review first.');", '')}}), /trace \d+ step \d+ settle/);
});
test('a miscounted missing item is rejected by the replay', {timeout: scaledTimeout(240000)}, async () => {
  await assert.rejects(replayPhotosAgentHost({traces: 60, maxSteps: 24, rewrite: {[adapter]: text =>
    text.replace('return { rows, missing: ids.length - rows.length };', 'return { rows, missing: 0 };')}}), /trace \d+ step \d+ (settle|request)/);
});
// The replay mounts a fixture host; the real camera-adapter host must lend the same ports.
test('camera-adapter lends the visit, busy and review ports the replay assumes', () => {
  const text = readFileSync('apps/app/src/prototype/camera-adapter.ts', 'utf8');
  assert.match(text, /const owner=photosApi,visit=hostVisit;if\(!owner\?\.isActive\(\)\|\|disposed\)throw new LibraryAgentRefusal\('Open Photos, then ask again\.'\);/);
  assert.match(text, /if\(edit\|\|closeVideoEdit\|\|mutating\|\|sharing\)throw new LibraryAgentRefusal\('Photos is busy right now\.'\);/);
  assert.match(text, /current:\(\)=>!disposed&&!document\.hidden&&owner\.isActive\(\)&&visit===hostVisit,/);
  assert.match(text, /busy:\(\)=>!!\(edit\|\|closeVideoEdit\|\|mutating\|\|sharing\),/);
  assert.match(text, /reviewOpen:\(\)=>!!albumReview\|\|!!shareReview\|\|deviceLibrary\.reviewBusy\(\),/);
  assert.match(text, /deviceLibrary\.leave\(\);\+\+hostVisit;/);
  assert.match(text, /const visibility = \(\) => \{ if \(document\.hidden\) \{ \+\+hostVisit;/);
});
