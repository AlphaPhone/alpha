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
    for (const scenario of ['sheet', 'full', 'uncovered', 'ready', 'abort']) {
      const fixture = await browser.page();
      const {page} = fixture;
      try {
        const preview = await mountCameraPreviewPort(fixture);
        await page.evaluate(installCapturePort, {mediaId, operationId});
        await preview.open(1);
        const abortClosing = scenario === 'abort';
        const alreadyReady = scenario === 'ready' || abortClosing;
        const reopensChat = scenario === 'sheet' || scenario === 'full';
        if (alreadyReady) {
          await preview.release(1);
          await preview.ready(1);
        }
        const chat = async panel => {
          await page.evaluate(chat => window.quintMountedCalendar.setState({chat}), panel);
          await page.waitForFunction(panel => window.quintMountedCalendar.S().chat === panel &&
            window.quintMountedCamera().chat === ['sheet', 'full'].includes(panel), panel);
        };
        const observe = () => page.evaluate(() => {
          const {shutters, result} = window.quintAgentCapture;
          const shell = window.quintMountedCalendar.S();
          return {'s.view': shell.view, 's.chat': shell.chat, 's.phase': window.quintMountedCamera().phase,
            's.shutters': shutters, 's.outcome': result?.status ?? 'none', 's.saved': !!result?.cameraResult};
        });
        const initialChat = alreadyReady ? 'full' : 'sheet';
        await chat(initialChat);
        if (alreadyReady) {
          await page.waitForFunction(() => {
            const panel = document.querySelector('[data-alpha-layer="conversation"]');
            return panel && Number(getComputedStyle(panel).opacity) === 1 &&
              panel.getBoundingClientRect().height > 100;
          });
        }
        if (abortClosing) {
          await page.addStyleTag({content: '[data-alpha-layer="conversation"][inert] { transition-duration: 60s !important; }'});
        }
        const initial = await observe();
        const description = abortClosing ? 'request aborts while the closing panel still covers the ready preview' :
          reopensChat ? `owner opens ${scenario} while the preview is starting` :
            `${initial['s.phase']} preview saves once after the owner can see it`;
        const observed = trace(description,
          {'s.shutters': initial['s.shutters'], 's.outcome': initial['s.outcome']});
        checkpoint(observed, 'Camera is beneath the initial conversation',
          call('place', 'camera', initialChat, alreadyReady ? 'ready' : 'starting', false), initial);
        await page.evaluate(() => window.quintAgentCapture.start());
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
          await page.waitForFunction(() => window.quintMountedCalendar.S().chat === 'hidden');
          const held = await observe();
          assert.equal(held['s.shutters'], 0);
          assert.equal(held['s.outcome'], 'none');
          checkpoint(observed, 'The agent hides the conversation and waits for the preview', call('admit'), held);
          if (reopensChat) {
            await chat(scenario);
            checkpoint(observed, 'The owner covers the live viewfinder before it is ready',
              call('ownerCoversChat', scenario), await observe());
          }
          await preview.release(1);
        }
        await page.waitForFunction(() => !!window.quintAgentCapture.result);
        const {result, shutterCovered} = await page.evaluate(() => window.quintAgentCapture);
        const final = await observe();
        if (abortClosing) {
          assert.equal(result.status, 'failed');
          assert.equal(final['s.shutters'], 0);
          checkpoint(observed, 'Retiring the request prevents a late shutter', [call('abort'), call('recheckFails')], final);
          await page.evaluate(async () => {
            const panel = document.querySelector('[data-alpha-layer="conversation"]');
            const animations = panel.getAnimations();
            for (const animation of animations) animation.finish();
            await Promise.allSettled(animations.map(animation => animation.finished));
          });
          assert.deepEqual(await observe(), final);
        } else if (reopensChat) {
          assert.equal(result.status, 'failed', `The ${scenario} must stop a queued shutter`);
          assert.equal(final['s.shutters'], 0);
          assert.equal(result.cameraResult, undefined);
          checkpoint(observed, 'A covered viewfinder refuses capture before any write', [call('previewReady'), call('recheckFails')], final);
        } else {
          assert.equal(result.status, 'succeeded');
          assert.equal(final['s.shutters'], 1);
          assert.equal(shutterCovered, false, 'The closing conversation must clear the viewfinder before the shutter');
          assert.equal(result.cameraResult.mediaId, mediaId);
          assert.equal(result.cameraResult.operationId, operationId);
          checkpoint(observed, 'The uncovered preview completes one identified capture',
            [alreadyReady ? call('admit') : call('previewReady'), call('shutter'), call('written', 'succeeded')], final);
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
  assert.equal(receipt.traces, 5);
});
