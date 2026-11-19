import assert from 'node:assert/strict';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {checkTraces} from '../specs/quint/refinement/check-traces.mjs';
import {boundInputs, call, captureSources, checkpoint, trace} from '../specs/quint/refinement/application/support.mjs';
import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';
import {startMountedCalendar, mountedCalendarFixtureSources} from './fixtures/calendar-mounted-editor.mjs';
import {mountCameraPreviewPort} from './fixtures/camera-preview-port.mjs';

const driver = fileURLToPath(import.meta.url);
const mediaId = '1792274767123123456789012';
const operationId = 'f7db2a46-9cf8-4856-916c-0f91e4d15641';
const inputs = ['apps/app/src/prototype/camera-adapter.ts', 'apps/app/src/prototype/browser-camera.ts',
  'apps/app/src/prototype/model.js', 'apps/app/src/prototype/template.html',
  'apps/app/src/prototype/chat-overlay-motion-adapter.ts', 'test/fixtures/camera-preview-port.mjs',
  '.eliza/client-features/plugins/plugin-native-camera/src/session.ts'];

async function installCapturePort({mediaId, operationId}) {
  const {browserCamera} = await import('/src/prototype/browser-camera.ts');
  const {captureAgentPhoto} = await import('/src/prototype/camera-adapter.ts');
  const state = window.quintAgentCapture = {shutters: 0, result: null, shutterCovered: false};
  browserCamera.capturePhoto = async () => {
    state.shutters++;
    const panel = document.querySelector('[data-alpha-layer="conversation"]');
    const preview = document.querySelector('[data-alpha-camera="viewfinder"]').getBoundingClientRect();
    const box = panel?.getBoundingClientRect();
    state.shutterCovered = !!box && box.height > 0 && box.top < preview.bottom && box.bottom > preview.top &&
      box.left < preview.right && box.right > preview.left && Number(getComputedStyle(panel).opacity) > 0;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 16;
    return {path: `browser-photo:///${mediaId}`, format: 'jpeg', width: 16, height: 16,
      base64: canvas.toDataURL('image/jpeg').split(',')[1]};
  };
  state.start = () => {
    state.controller = new AbortController();
    void captureAgentPhoto(operationId, state.controller.signal, () => {}).then(result => {state.result = result;});
  };
}

test('the mounted agent shutter requires the current viewfinder to be uncovered', {timeout: scaledTimeout(240_000)}, async () => {
  const sources = new Set([driver, ...mountedCalendarFixtureSources, ...inputs]);
  captureSources([...sources]);
  const browser = await startMountedCalendar({observeCamera: true, onSource(path) {
    if (sources.has(path)) return;
    sources.add(path);
    captureSources([path]);
  }});
  const traces = [];
  try {
    for (const scenario of ['sheet', 'full', 'uncovered', 'ready', 'abort', 'closing', 'painted']) {
      const fixture = await browser.page();
      const {page} = fixture;
      try {
        const preview = await mountCameraPreviewPort(fixture);
        await page.evaluate(installCapturePort, {mediaId, operationId});
        await preview.open(1);
        const abortClosing = scenario === 'abort';
        // The owner has just closed the chat: the committed chat is hidden, its panel still painted.
        const ownerClosing = scenario === 'closing';
        // The owner reopens and closes the chat while the preview starts; only the panel covers it.
        const paintedAtGate = scenario === 'painted';
        const alreadyReady = scenario === 'ready' || abortClosing || ownerClosing;
        const reopensChat = scenario === 'sheet' || scenario === 'full';
        // Portrait Camera is laid out above an open sheet: only a full chat covers its viewfinder.
        const sheetKept = scenario === 'uncovered';
        if (alreadyReady) {
          await preview.release(1);
          await preview.ready(1);
        }
        const chat = async panel => {
          await page.evaluate(chat => window.quintMountedCalendar.setState({chat}), panel);
          await page.waitForFunction(panel => window.quintMountedCalendar.S().chat === panel &&
            window.quintMountedCamera().chat === (panel === 'full'), panel);
        };
        const observe = () => page.evaluate(() => {
          const {shutters, result} = window.quintAgentCapture;
          const shell = window.quintMountedCalendar.S();
          return {'s.view': shell.view, 's.chat': shell.chat, 's.phase': window.quintMountedCamera().phase,
            's.shutters': shutters, 's.outcome': result?.status ?? 'none', 's.saved': !!result?.cameraResult};
        });
        const painted = () => page.waitForFunction(() => {
          const panel = document.querySelector('[data-alpha-layer="conversation"]');
          return panel && Number(getComputedStyle(panel).opacity) === 1 &&
            panel.getBoundingClientRect().height > 100;
        });
        const slowClose = () => page.addStyleTag({content: '[data-alpha-layer="conversation"][inert] { transition-duration: 60s !important; }'});
        const closing = () => page.waitForFunction(() => {
          const panel = document.querySelector('[data-alpha-layer="conversation"][inert]');
          return window.quintMountedCalendar.S().chat === 'hidden' &&
            panel?.getAnimations().length > 0 && Number(getComputedStyle(panel).opacity) > 0;
        });
        const finishClosing = () => page.evaluate(async () => {
          const panel = document.querySelector('[data-alpha-layer="conversation"]');
          const animations = panel.getAnimations();
          for (const animation of animations) animation.finish();
          await Promise.allSettled(animations.map(animation => animation.finished));
        });
        const frames = () => page.evaluate(() => new Promise(resolve =>
          requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 250)))));
        const initialChat = sheetKept ? 'sheet' : 'full';
        await chat(initialChat);
        await painted();
        if (abortClosing || ownerClosing) await slowClose();
        const initial = await observe();
        const description = abortClosing ? 'request aborts while the closing panel still covers the ready preview' :
          reopensChat ? `owner opens ${scenario} while the preview is starting` :
            ownerClosing ? 'request admitted while the owner closing panel still covers the ready preview' :
              paintedAtGate ? 'owner reopens and closes the chat so a painted panel reaches the shutter gate' :
                sheetKept ? 'an open sheet stays open above Camera while the preview starts and saves once' :
                  `${initial['s.phase']} preview saves once after the owner can see it`;
        const observed = trace(description,
          {'s.shutters': initial['s.shutters'], 's.outcome': initial['s.outcome']});
        checkpoint(observed, 'Camera is beneath the initial conversation',
          call('place', 'camera', initialChat, alreadyReady ? 'ready' : 'starting', false), initial);
        if (ownerClosing) {
          await chat('hidden');
          await closing();
          checkpoint(observed, 'The owner commits the close while its panel still paints over Camera',
            call('ownerClosesChat'), await observe());
        }
        await page.evaluate(() => window.quintAgentCapture.start());
        if (ownerClosing) {
          await frames();
          const waiting = await observe();
          assert.equal(waiting['s.shutters'], 0, 'A painted closing panel must hold the shutter');
          assert.equal(waiting['s.outcome'], 'none', 'The request waits for the closing panel instead of refusing');
          checkpoint(observed, 'The request waits for the painted closing panel', call('admit'), waiting);
          await finishClosing();
        }
        if (abortClosing) {
          await page.waitForFunction(() => {
            const panel = document.querySelector('[data-alpha-layer="conversation"][inert]');
            return window.quintMountedCalendar.S().chat === 'hidden' &&
              panel?.getAnimations().length > 0 && Number(getComputedStyle(panel).opacity) > 0;
          });
          const waiting = await observe();
          assert.equal(waiting['s.outcome'], 'none');
          assert.equal(waiting['s.shutters'], 0);
          checkpoint(observed, 'The shell committed the close and its panel is still closing', call('admit'), waiting);
          await page.evaluate(() => window.quintAgentCapture.controller.abort());
        }
        if (!alreadyReady) {
          if (sheetKept) await page.waitForFunction(() => window.quintMountedCalendar.S().chat === 'sheet' && window.quintMountedCamera().agentQueued === true);
          else await page.waitForFunction(() => window.quintMountedCalendar.S().chat === 'hidden');
          const held = await observe();
          assert.equal(held['s.shutters'], 0);
          assert.equal(held['s.outcome'], 'none');
          checkpoint(observed, sheetKept ? 'The open sheet keeps its detent while the request waits for the preview' :
            'The agent hides the full conversation and waits for the preview', call('admit'), held);
          if (reopensChat) {
            await chat(scenario);
            checkpoint(observed, scenario === 'full' ? 'The owner covers the live viewfinder before it is ready' :
              'The owner opens the sheet below the live viewfinder before it is ready',
              call('ownerCoversChat', scenario), await observe());
          }
          if (paintedAtGate) {
            await page.waitForFunction(() => {
              const panel = document.querySelector('[data-alpha-layer="conversation"]');
              return panel.getAnimations().length === 0 && Number(getComputedStyle(panel).opacity) === 0;
            });
            await frames();
            checkpoint(observed, 'The agent close has cleared the viewfinder', [call('panelCleared'), call('revealed')], await observe());
            await chat('full');
            await painted();
            checkpoint(observed, 'The owner reopens the chat while the preview starts',
              call('ownerCoversChat', 'full'), await observe());
            await slowClose();
            await chat('hidden');
            await closing();
            checkpoint(observed, 'The owner closes it again and the panel is still painted',
              call('ownerClosesChat'), await observe());
          }
          await preview.release(1);
        }
        await page.waitForFunction(() => !!window.quintAgentCapture.result);
        const {result, shutterCovered} = await page.evaluate(() => window.quintAgentCapture);
        const final = await observe();
        if (abortClosing) {
          assert.equal(result.status, 'failed');
          assert.equal(final['s.shutters'], 0);
          checkpoint(observed, 'Retiring the request prevents a late shutter', [call('abort'), call('revealFails')], final);
          await finishClosing();
          assert.deepEqual(await observe(), final);
        } else if (paintedAtGate) {
          assert.equal(result.status, 'failed');
          assert.equal(result.summary, 'Camera viewfinder is covered');
          assert.equal(final['s.shutters'], 0);
          assert.equal(final['s.chat'], 'hidden');
          checkpoint(observed, 'The shutter gate refuses the painted panel before any write',
            [call('previewReady'), call('recheckFails')], final);
          await finishClosing();
          assert.deepEqual(await observe(), final);
        } else if (scenario === 'full') {
          assert.equal(result.status, 'failed', `The ${scenario} must stop a queued shutter`);
          assert.equal(final['s.shutters'], 0);
          assert.equal(result.cameraResult, undefined);
          // Once the hold is gone, the chat grace may already have released the covered preview.
          checkpoint(observed, 'A covered viewfinder refuses capture before any write',
            [call('revealed'), call('previewReady'), call('recheckFails'),
              ...(final['s.phase'] === 'off' ? [call('chatGraceReleases')] : [])], final);
        } else {
          assert.equal(result.status, 'succeeded');
          assert.equal(final['s.shutters'], 1);
          assert.equal(shutterCovered, false, 'The conversation must be off the viewfinder before the shutter');
          assert.equal(result.cameraResult.mediaId, mediaId);
          assert.equal(result.cameraResult.operationId, operationId);
          // An open sheet stays open through the capture; nothing closed it to reveal the viewfinder.
          if (sheetKept || scenario === 'sheet') assert.equal(final['s.chat'], 'sheet');
          const reveal = sheetKept ? [] : scenario === 'sheet' ? [call('revealed')] : [call('panelCleared'), call('revealed')];
          checkpoint(observed, 'The uncovered preview completes one identified capture',
            [...(ownerClosing ? [] : alreadyReady ? [call('admit')] : []), ...reveal,
              ...(alreadyReady ? [] : [call('previewReady')]), call('shutter'), call('written', 'succeeded')], final);
        }
        traces.push(observed);
      } finally { await fixture.close(); }
    }
  } finally { await browser.close(); }
  const receipt = await checkTraces(boundInputs({model: 'CameraAgentCapture', scope: 'bounded-orchestration',
    sources: [...sources], traces, assumptions: ['The real Camera adapter and shell run under Chromium.',
      'Synthetic video tracks control preview arrival. A synthetic capture port counts dispatches and returns one photo identity.',
      'These traces cover capture after proposal admission. They do not qualify a native Android camera.']}));
  assert.equal(receipt.passed, true);
  assert.equal(receipt.inputsUnchanged, true);
  assert.equal(receipt.driverInputsBound, true);
  assert.equal(receipt.traces, 7);
});

async function installStoredCapturePort() {
  const {browserCamera, browserPhotoLibrary} = await import('/src/prototype/browser-camera.ts');
  const {captureAgentPhoto} = await import('/src/prototype/camera-adapter.ts');
  const state = window.quintStoredCapture = {
    agentShots: 0, ownerShots: 0, result: null, dispatched: false,
    ownerRows: new Set(), contextCurrent: true, controller: null, fault: null, release: null,
  };
  const capture = browserCamera.capturePhoto.bind(browserCamera);
  browserCamera.capturePhoto = async options => {
    const agent = window.quintMountedCamera().agentQueued === false;
    if (agent) {
      state.agentShots++;
      state.dispatched = true;
    } else state.ownerShots++;
    const fault = state.fault;
    state.fault = null;
    if (fault === 'hold') await new Promise(resolve => {state.release = resolve;});
    const add = IDBObjectStore.prototype.add;
    if (fault === 'rollback') IDBObjectStore.prototype.add = function (row, ...keys) {
      const request = add.call(this, row, ...keys);
      if (this.name === 'photos' && row.kind === 'image') this.transaction.abort();
      return request;
    };
    try {
      const receipt = await capture(options);
      if (!agent) state.ownerRows.add(receipt.path.split('/').pop());
      if (fault === 'lost-receipt') throw Error('Synthetic bridge answer lost after storage committed');
      return receipt;
    } finally {
      if (fault === 'rollback') IDBObjectStore.prototype.add = add;
    }
  };
  state.start = (id, fault = null) => {
    state.controller = new AbortController();
    state.fault = fault;
    state.result = null;
    state.dispatched = false;
    state.contextCurrent = true;
    void captureAgentPhoto(id, state.controller.signal, () => {
      if (!state.contextCurrent) throw Error('Synthetic request context retired');
    }).then(result => {state.result = result;});
  };
  state.secondRequest = id => captureAgentPhoto(id, new AbortController().signal, () => {});
  state.snapshot = async () => {
    const camera = window.quintMountedCamera();
    const images = (await browserPhotoLibrary.list()).items.filter(row => row.kind === 'image')
      .map(({id, width, height, image}) => ({id, width, height, jpeg: image.startsWith('data:image/jpeg;base64,')}));
    return {
      view: window.quintMountedCalendar.S().view === 'camera', camera, images,
      agentRows: images.filter(row => !state.ownerRows.has(row.id)).length,
      agentShots: state.agentShots, ownerShots: state.ownerShots, result: state.result,
      dispatched: state.dispatched,
    };
  };
}

function storedCaptureProjection(state) {
  const {camera} = state;
  const request = camera.agentQueued === true ? 'queued' : camera.agentQueued === false ? 'dispatched' : 'none';
  const busyBy = camera.recordingBusy ? 'recording' : camera.capturing ? (request === 'dispatched' ? 'agent' : 'owner') : 'none';
  return {'s.view': state.view, 's.phase': camera.phase, 's.busyBy': busyBy, 's.request': request,
    's.refused': camera.agentRefused, 's.result': state.result?.status ?? 'none',
    's.dispatched': state.dispatched, 's.agentRows': state.agentRows, 's.holds': camera.captureHolds};
}

const secondOperationId = '8056107e-4b77-4328-8c74-882c453e04fb';

function assertStoredReceipt(state, id, previousIds = []) {
  const {cameraResult, status} = state.result;
  assert.equal(status, 'succeeded');
  const added = state.images.filter(row => !previousIds.includes(row.id));
  assert.equal(added.length, 1);
  const [row] = added;
  assert.equal(row.jpeg, true);
  assert.deepEqual(cameraResult, {version: 1, kind: 'camera_capture_photo', operationId: id, mediaId: row.id,
    width: row.width, height: row.height, mime: 'image/jpeg'});
  assert.deepEqual([row.width, row.height], [320, 240]);
}

test('mounted assistant photo requests preserve preview ownership, exclusive dispatch and stored receipts', {timeout: scaledTimeout(240_000)}, async () => {
  const sources = new Set([driver, ...mountedCalendarFixtureSources, ...inputs]);
  captureSources([...sources]);
  const browser = await startMountedCalendar({observeCamera: true, onSource(path) {
    if (sources.has(path)) return;
    sources.add(path);
    captureSources([path]);
  }});
  const traces = [];
  try {
    async function replay(name, run) {
      const fixture = await browser.page();
      const {page} = fixture;
      try {
        const preview = await mountCameraPreviewPort(fixture);
        await page.evaluate(installStoredCapturePort);
        const snapshot = () => page.evaluate(() => window.quintStoredCapture.snapshot());
        const observed = trace(name, {'s.agentRows': (await snapshot()).agentRows});
        const mark = async (label, actions, extra = {}) => {
          const actual = await snapshot();
          checkpoint(observed, label, actions, {...storedCaptureProjection(actual), ...extra});
          return actual;
        };
        const ask = (id = operationId, fault = null) => page.evaluate(([id, fault]) => window.quintStoredCapture.start(id, fault), [id, fault]);
        const result = () => page.waitForFunction(() => !!window.quintStoredCapture.result);
        const settlePreview = async () => {await preview.release(1); await preview.ready(1);};
        const releaseShutter = () => page.evaluate(() => window.quintStoredCapture.release());
        const open = async () => {
          await preview.open(1);
          await mark('The owner opens Camera and owns the pending preview', call('startPreview'), {'s.startsByAgent': 0});
        };
        await run({page, fixture, preview, snapshot, mark, ask, result, settlePreview, releaseShutter, open});
        traces.push(observed);
      } finally {await fixture.close();}
    }

    await replay('the request joins the owner preview and writes exactly one row per shutter', async c => {
      await c.open();
      await c.ask(operationId, 'hold');
      await c.page.waitForFunction(() => window.quintMountedCamera().agentQueued === true);
      assert.equal((await c.preview.snapshot()).requests.length, 1);
      await c.mark('The queued request keeps the existing preview token and one hold', call('agentAsks'), {'s.startsByAgent': 0});
      const rejected = await c.page.evaluate(id => window.quintStoredCapture.secondRequest(id), secondOperationId);
      assert.equal(rejected.status, 'failed');
      assert.equal(rejected.cameraResult, undefined);
      await c.mark('A second request cannot take the occupied slot', null);
      await c.settlePreview();
      await c.page.waitForFunction(() => typeof window.quintStoredCapture.release === 'function');
      const inFlight = await c.mark('Only the agent owns the shutter while its port is held', [call('startSettles', true), call('agentResumes')]);
      assert.equal(inFlight.agentShots, 1);
      assert.equal(inFlight.images.length, 0);
      await c.releaseShutter();
      await c.result();
      const first = await c.mark('The storage row matches the successful receipt', call('shutterSettles', 'saved', true));
      assertStoredReceipt(first, operationId);
      await c.ask(secondOperationId);
      await c.result();
      const second = await c.mark('A fresh request takes a separate identified photo', [call('agentAsks'), call('shutterSettles', 'saved', true)]);
      assert.equal(second.agentShots, 2);
      assertStoredReceipt(second, secondOperationId, first.images.map(row => row.id));
      assert.equal((await c.preview.snapshot()).requests.length, 1);
    });

    await replay('the request starts one fresh preview after a denied start and takes no failed photo', async c => {
      await c.open();
      await c.preview.reject(1);
      await c.page.waitForFunction(() => window.quintMountedCamera().phase === 'error');
      await c.mark('The first preview settles unavailable', call('startSettles', false));
      await c.ask();
      await c.page.waitForFunction(() => window.quintCameraLeave.pending.some(request => request.id === 2));
      const started = await c.preview.snapshot();
      assert.equal(started.current, 2);
      assert.equal(started.requests.length, 2);
      await c.mark('The agent owns exactly one new preview attempt', call('agentAsks'), {'s.startsByAgent': 1});
      await c.preview.reject(2);
      await c.result();
      const failed = await c.mark('The unavailable retry retires without dispatch or storage', [call('startSettles', false), call('agentResumes')]);
      assert.equal(failed.agentShots, 0);
      assert.deepEqual(failed.images, []);
    });

    await replay('an owner shutter excludes the agent while preserving the owner photo', async c => {
      await c.open();
      await c.settlePreview();
      await c.mark('The real owner preview is ready', call('startSettles', true));
      await c.page.evaluate(() => {window.quintStoredCapture.fault = 'hold';});
      await c.fixture.button('Take photo').click();
      await c.page.waitForFunction(() => typeof window.quintStoredCapture.release === 'function');
      await c.mark('The owner holds the exclusive shutter', call('ownerShutter'));
      await c.ask();
      await c.result();
      const failed = await c.mark('The busy refusal leaves the owner in control', call('agentAsks'));
      assert.equal(failed.agentShots, 0);
      assert.equal(failed.ownerShots, 1);
      assert.deepEqual(failed.images, []);
      await c.releaseShutter();
      await c.page.waitForFunction(() => !window.quintMountedCamera().capturing);
      const owner = await c.mark('Only the owner photo is stored before the camera is idle', call('cameraIdle'));
      assert.equal(owner.images.length, 1);
      assert.equal(owner.agentRows, 0);
      await c.ask(secondOperationId);
      await c.result();
      const saved = await c.mark('A later independent request can acquire the shutter', [call('agentAsks'), call('shutterSettles', 'saved', true)]);
      assertStoredReceipt(saved, secondOperationId, owner.images.map(row => row.id));
    });

    for (const abort of [false, true]) await replay(abort ? 'abort while preview is still pending' : 'retired context refuses on preview readiness', async c => {
      await c.open();
      await c.ask();
      await c.page.waitForFunction(() => window.quintMountedCamera().agentQueued === true);
      await c.mark('The request waits without taking a shutter', call('agentAsks'));
      if (abort) {
        await c.page.evaluate(() => window.quintStoredCapture.controller.abort());
        await c.result();
        await c.mark('Abort releases the request while the owner preview remains pending', call('cancelWaiting'));
        await c.settlePreview();
        await c.mark('The owner preview can still become ready after abort', call('startSettles', true));
      } else {
        await c.page.evaluate(() => {window.quintStoredCapture.contextCurrent = false;});
        await c.mark('The previous request context is retired', call('requestChanges'), {'s.aborted': true});
        await c.settlePreview();
        await c.result();
        await c.mark('The dispatcher rechecks context before taking a shutter', [call('startSettles', true), call('agentResumes')]);
      }
      const failed = await c.snapshot();
      assert.equal(failed.agentShots, 0);
      assert.equal(failed.result.status, 'failed');
      assert.deepEqual(failed.images, []);
    });

    await replay('leaving Camera retires the request and disposes its late preview', async c => {
      await c.open();
      await c.ask();
      await c.page.waitForFunction(() => window.quintMountedCamera().agentQueued === true);
      await c.mark('The request joins the Camera preview under its current owner', call('agentAsks'));
      await c.preview.leave();
      await c.result();
      await c.mark('The real Home transition retires the preview and queued shutter', [call('leaveView'), call('agentResumes')]);
      await c.preview.release(1);
      await c.preview.ended([1]);
      const failed = await c.mark('The retired late stream cannot become a preview or a photo', null);
      assert.equal(failed.result.status, 'failed');
      assert.equal(failed.agentShots, 0);
      assert.deepEqual(failed.images, []);
      assert.equal((await c.preview.snapshot()).preview, 0);
    });

    await replay('recording starts first while the admitted photo waits for reveal', async c => {
      await c.open();
      await c.page.evaluate(() => window.quintMountedCalendar.setState({chat: 'full'}));
      await c.page.waitForFunction(() => Number(getComputedStyle(document.querySelector('[data-alpha-layer="conversation"]')).opacity) === 1);
      await c.page.addStyleTag({content: '[data-alpha-layer="conversation"][inert] { transition-duration: 60s !important; }'});
      await c.ask();
      await c.page.waitForFunction(() => window.quintMountedCamera().agentQueued === true && window.quintMountedCalendar.S().chat === 'hidden');
      await c.mark('The request waits through the real closing panel', call('agentAsks'));
      await c.settlePreview();
      await c.mark('The owner preview is ready while the request remains queued', call('startSettles', true));
      await c.page.evaluate(() => {
        const source = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = async constraints => {
          if (constraints.audio) throw new DOMException('Synthetic audio denial', 'NotAllowedError');
          return source(constraints);
        };
      });
      await c.fixture.button('Video mode').click();
      await c.fixture.button('Start recording').click();
      await c.fixture.button('Record without sound').click();
      await c.fixture.button('Stop recording').waitFor();
      await c.mark('Owner recording takes the actual session and refuses the queued photo', call('recordingStarts'));
      await c.page.evaluate(() => document.querySelector('[data-alpha-layer="conversation"]').getAnimations().forEach(animation => animation.finish()));
      await c.result();
      const failed = await c.mark('Reveal completion cannot take a photo over the owner recording', call('agentResumes'));
      assert.equal(failed.result.summary, 'Recording — no photo');
      assert.equal(failed.agentShots, 0);
      assert.deepEqual(failed.images, []);
      await c.fixture.button('Stop recording').click();
      await c.page.waitForFunction(() => !window.quintMountedCamera().recordingBusy);
      await c.mark('Finishing the recording releases the shared session', call('cameraIdle'));
    });

    for (const fault of ['rollback', 'lost-receipt']) await replay(`the shutter is unknown after ${fault}`, async c => {
      await c.open();
      await c.settlePreview();
      await c.mark('The real preview is ready for a new request', call('startSettles', true));
      await c.ask(operationId, fault);
      await c.result();
      const written = fault === 'lost-receipt';
      const unknown = await c.mark('The actual browser catalog proves the post-dispatch row count',
        [call('agentAsks'), call('shutterSettles', 'threw', written)]);
      assert.equal(unknown.result.status, 'unknown');
      assert.equal(unknown.result.cameraResult, undefined);
      assert.equal(unknown.agentShots, 1);
      assert.equal(unknown.images.length, written ? 1 : 0);
      if (written) assert.equal(unknown.images[0].jpeg, true);
    });
  } finally {await browser.close();}
  const receipt = await checkTraces(boundInputs({model: 'AgentPhotoRequest', scope: 'bounded-orchestration',
    sources: [...sources], traces, assumptions: ['The complete Camera adapter, shell, browser media implementation and shared session run in Chromium.',
      'Canvas MediaStreams drive the preview and owner recording. The browser photo catalog uses IndexedDB; a failed transaction and a lost reply after commit are injected at their separate effect boundaries.',
      'The supplied current-context guard and abort signal enter at the adapter boundary. Proposal transport and Android sensor, MediaStore and device acceptance are separate.']}));
  assert.equal(receipt.passed, true);
  assert.equal(receipt.inputsUnchanged, true);
  assert.equal(receipt.driverInputsBound, true);
  assert.equal(receipt.traces, 9);
});
