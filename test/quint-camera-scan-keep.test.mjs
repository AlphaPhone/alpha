import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {modelTraces, replayTraces, settle} from '../specs/quint/refinement/application/notes-files-media-itf.mjs';
import {tsImport} from './support/ts-import.mjs';
import {prepareClientFeatures} from '../scripts/prepare-client-features.ts';

// CameraScanKeep against createScanCapture in apps/app/src/ui/camera/scan-document.ts, the Keep of
// Camera's scan review. Port: the host Keep, answered by the driver. Operation identities are numbered
// in the order the host first sees them, so a retry that reuses an identity sends the same number.

prepareClientFeatures();
const {createScanCapture} = await tsImport('../apps/app/src/ui/camera/scan-document.ts', import.meta.url);

async function replayCameraScanKeep(options) {
  const traces = modelTraces({path: 'specs/quint/application/CameraScanKeep.qnt', main: 'CameraScanKeep', ...options});
  return replayTraces(traces, {
    required: ['keep', 'hostSaves', 'hostFails', 'hostUnknown', 'close'],
    project: state => {
      const {identity: _identity, ...observable} = state.s;
      return observable;
    },
    reached: {
      'a retry after an unknown answer that had saved': state => state.s.review === 'saved' && state.s.identity === 1 && state.s.kept.length === 1,
      'a save under a second identity after a failure': state => state.s.review === 'saved' && state.s.identity === 2,
      'an answer after the review closed': state => state.s.closed && !['keeping', 'idle'].includes(state.s.review),
      'a refused Keep press': state => state.s.refused > 0,
    },
    async start() {
      const identities = new Map(), kept = new Set();
      let pending, refused = 0, keptClosed = false;
      let capture;
      const keepPort = (_image, operationId, signal) => new Promise((resolve, reject) => {
        if (!identities.has(operationId)) identities.set(operationId, identities.size + 1);
        if (capture?.closed) keptClosed = true;
        pending = {id: identities.get(operationId), signal, resolve, reject};
      });
      capture = createScanCapture({frame: 'unsaved camera frame'}, 'unsaved', keepPort);
      const answer = () => { const call = pending; pending = undefined; return call; };
      return {
        actions: {
          async keep() { void capture.keep().then(outcome => { if (outcome === undefined) refused++; }); await settle(); },
          async hostSaves() { const call = answer(); kept.add(call.id); call.resolve({status: 'saved', id: '41', message: 'Kept in Photos.'}); await settle(); },
          async hostFails() { answer().resolve({status: 'failed', message: 'Discarded'}); await settle(); },
          async hostUnknown({wrote, thrown}) {
            const call = answer();
            if (wrote) kept.add(call.id);
            if (thrown) call.reject(Error('The bridge answer was lost.'));
            else call.resolve({status: 'unknown', message: 'Keep photo unconfirmed.'});
            await settle();
          },
          async close() { capture.close(); await settle(); },
        },
        observe() {
          return {review: capture.state, closed: capture.closed, inflight: pending?.id ?? 0, aborted: pending?.signal.aborted ?? false,
            kept: [...kept].sort((a, b) => a - b), refused, keptClosed};
        },
      };
    },
  });
}

test('the scanned frame Keep follows every CameraScanKeep model step', {timeout: scaledTimeout(180000)}, async () => {
  const receipt = await replayCameraScanKeep({traces: 300, maxSteps: 12});
  assert.equal(receipt.traces, 300);
  assert.ok(receipt.steps > 1000, JSON.stringify(receipt));
  for (const action of ['keep', 'hostSaves', 'hostFails', 'hostUnknown', 'close']) assert.ok(receipt.actions[action] > 0, action);
});
