import {test,expect} from '@playwright/test';
import {setupLiveAssistant} from './voice-assistant-fixture';
import {setup as setupOwnedVoice, utterance, voice as ownedVoice} from './owned-voice-navigation-fixture';
import {button, flagOffAndroid, residentHome, fenceNetwork} from './flag-off-android';

const productionFlagsBody = 'export const testMocksEnabled=false;export const devSurfacesEnabled=false;export const privateLocalPreviewEnabled=false;export const updateChannelCheckEnabled=false;';

test('Bug 1a/1b: local device speech prewarms at startup, never blocks startLiveCapture on localSpeechStatus, uses ttsOnly, and calls liveCaptureStatus once', async ({page}) => {
  await page.route('**/src/build-flags.ts*', route => route.fulfill({contentType: 'application/javascript', body: productionFlagsBody}));
  const foreign = await fenceNetwork(page);
  await flagOffAndroid(page);
  await page.addInitScript(() => {
    const w = window as any, c = w.Capacitor, prior = c.nativePromise;
    delete w.flagOff.slots['cloud:production'];
    w.flagOff.persist();
    const provider = {
      mode: 'own', revision: 'syn-r1', persistence: 'native-secure-store',
      keys: {text: {configured: true}, voice: {configured: false}},
      provider: 'cerebras', configured: true, selected: true, model: 'qwen-3.8-27b', voiceConfigured: false,
    };
    const metric = w.bug1Metrics = {
      prewarmLocalSpeechCalls: [] as any[],
      prewarmLiveRoutes: [] as string[],
      holdLocalSpeechAfterTap: false,
      tapOrder: [] as string[],
      tapLocalSpeechCalls: [] as any[],
      tapLiveStatusCount: 0,
      releaseHeldLocalSpeech: null as null | (() => void),
    };
    const events: Array<{event: string; callback: (value: any) => void}> = [];
    const header = c.PluginHeaders.find((p: any) => p.name === 'AlphaVoiceCloud');
    header.methods = [
      ...['checkPermissions', 'localSpeechStatus', 'liveCaptureStatus', 'startLiveCapture', 'stopLiveCapture', 'synthesizeLocal', 'play', 'stopPlayback', 'cancel', 'releaseLocalSpeech', 'cancelRecording', 'holdSpeechEngine', 'releaseSpeechEngineHold', 'warmSpeechOutput'].map(name => ({name, rtype: 'promise'})),
      {name: 'addListener', rtype: 'callback'},
      {name: 'removeListener', rtype: 'callback'},
    ];
    const cb = c.nativeCallback;
    c.nativeCallback = (plugin: string, method: string, input: any, fn: any) => {
      if (plugin === 'AlphaVoiceCloud' && method === 'addListener') {
        events.push({event: input.eventName, callback: fn});
        return String(events.length);
      }
      return cb(plugin, method, input, fn);
    };
    c.nativePromise = async (plugin: string, method: string, input: any) => {
      if (plugin === 'Agent' && method === 'providerStatus') return provider;
      if (plugin === 'Agent' && method === 'request' && String(input.path).startsWith('/api/asr/local-inference/live')) {
        if (!metric.holdLocalSpeechAfterTap) metric.prewarmLiveRoutes.push(String(input.path));
        if (input.path === '/api/asr/local-inference/live/status') return {status: 200, body: JSON.stringify({ready: true, streaming: true, sessions: 0, maxSessions: 4})};
        return {status: 200, body: JSON.stringify({ok: true, mode: 'stream'})};
      }
      if (plugin !== 'AlphaVoiceCloud') return prior(plugin, method, input);
      if (!metric.holdLocalSpeechAfterTap) {
        if (method === 'localSpeechStatus') metric.prewarmLocalSpeechCalls.push(structuredClone(input));
      } else {
        if (method === 'liveCaptureStatus') { metric.tapLiveStatusCount++; metric.tapOrder.push('liveCaptureStatus'); }
        if (method === 'startLiveCapture') metric.tapOrder.push('startLiveCapture');
        if (method === 'localSpeechStatus') {
          metric.tapLocalSpeechCalls.push(structuredClone(input));
          metric.tapOrder.push('localSpeechStatus:start');
          await new Promise<void>(resolve => { metric.releaseHeldLocalSpeech = resolve; });
          metric.tapOrder.push('localSpeechStatus:end');
          return {ready: true, execution: 'device'};
        }
      }
      if (method === 'checkPermissions') return {microphone: 'granted'};
      if (method === 'localSpeechStatus') return {ready: true, execution: 'device'};
      if (method === 'liveCaptureStatus') return {permission: true, available: true};
      if (method === 'startLiveCapture') return {captureId: input.captureId, sampleRate: 16000, echoCancelled: true};
      if (method === 'stopLiveCapture') {
        for (const row of events) if (row.event === 'liveCaptureEnded') row.callback({captureId: input.captureId});
        return {captureId: input.captureId, durationMs: 100};
      }
      return {};
    };
  });
  await residentHome(page);
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 150)));

  const prewarm = await page.evaluate(() => (window as any).bug1Metrics);
  expect(prewarm.prewarmLocalSpeechCalls.some((c: any) => c?.ttsOnly === true)).toBe(true);
  expect(prewarm.prewarmLiveRoutes).toContain('/api/asr/local-inference/live/status');

  await page.evaluate(() => { (window as any).bug1Metrics.holdLocalSpeechAfterTap = true; });
  await button(page, 'Talk').click();

  await expect.poll(() => page.evaluate(() => (window as any).bug1Metrics.tapOrder.includes('startLiveCapture'))).toBe(true);
  const afterTap = await page.evaluate(() => (window as any).bug1Metrics);
  expect(afterTap.tapLiveStatusCount).toBeLessThanOrEqual(1);
  if (afterTap.tapLocalSpeechCalls.length > 0) {
    expect(afterTap.tapLocalSpeechCalls.every((c: any) => c?.ttsOnly === true)).toBe(true);
  }
  await page.evaluate(() => (window as any).bug1Metrics.releaseHeldLocalSpeech?.());
  const voice = page.getByRole('region', {name: 'Voice conversation', exact: true});
  await expect(voice).toHaveAttribute('data-voice-state', 'listening');
  await voice.getByRole('button', {name: 'Stop voice conversation', exact: true}).click();
  expect(foreign).toEqual([]);
});

test('Bug 1b dictation: opening dictation never blocks startLiveCapture on localSpeechStatus', async ({page}) => {
  await page.route('**/src/build-flags.ts*', route => route.fulfill({contentType: 'application/javascript', body: productionFlagsBody}));
  await setupLiveAssistant(page);
  await page.evaluate(async () => {
    const {Component} = await import('/src/prototype/model.js');
    const orig = Component.prototype.renderVals;
    Component.prototype.renderVals = function (...args: any[]) {
      (window as any).__liveShell = this;
      return orig.apply(this, args);
    };
  });
  await page.evaluate(() => {
    const w = window as any, c = w.Capacitor, prior = c.nativePromise;
    w.dictMetrics = {localSpeechCalls: 0, startLiveCaptureCalls: 0, release: null as null | (() => void)};
    c.nativePromise = async (plugin: string, method: string, input: any) => {
      if (plugin === 'AlphaVoiceCloud' && method === 'localSpeechStatus') {
        w.dictMetrics.localSpeechCalls++;
        // Block forever unless released: dictation live capture must NEVER wait on localSpeechStatus.
        await new Promise<void>(resolve => { w.dictMetrics.release = resolve; });
        return {ready: true, execution: 'device'};
      }
      if (plugin === 'AlphaVoiceCloud' && method === 'startLiveCapture') {
        w.dictMetrics.startLiveCaptureCalls++;
      }
      return prior(plugin, method, input);
    };
  });
  await button(page, 'Notes').click();
  await expect(page.locator('html')).toHaveAttribute('data-active-view', 'notes');
  await expect.poll(() => page.evaluate(() => typeof (window as any).__liveShell?.startTranscription)).toBe('function');
  await page.evaluate(() => (window as any).__liveShell.startTranscription());
  await expect.poll(() => page.evaluate(() => (window as any).dictMetrics.startLiveCaptureCalls)).toBe(1);
  expect(await page.evaluate(() => (window as any).dictMetrics.localSpeechCalls)).toBe(0);
  await page.evaluate(() => (window as any).dictMetrics.release?.());
});

test('Bug 3a: review proposal without awaitingUserInput, action notice, and email draft keep mic open and listening', async ({page}) => {
  await setupOwnedVoice(page, 'sheet', true);

  // 1. Review proposal without awaitingUserInput
  await page.evaluate(async () => {
    const f = (window as any).ownedVoiceNavigation;
    const {alphaClient} = await import('/src/runtime/alpha-client.ts');
    const transport = (alphaClient as any).transport;
    transport.send = async (input: any) => {
      if (f.turnMode === 'proposal') {
        return {
          text: 'Here is a proposal to review.',
          messageId: crypto.randomUUID(),
          userMessageId: crypto.randomUUID(),
          messageBinding: {conversationId: f.room, session: f.session},
          proposals: [{
            id: 'prop-1',
            title: 'Move lunch',
            description: 'Reschedule lunch to 1pm',
            expiresAt: Date.now() + 60_000,
            contextRevision: input.context.revision,
          }],
        };
      }
      if (f.turnMode === 'notice') {
        return {
          text: '',
          messageId: crypto.randomUUID(),
          userMessageId: crypto.randomUUID(),
          messageBinding: {conversationId: f.room, session: f.session},
          notices: ['Create reminder: Pick up package'],
        };
      }
      return {
        text: 'I prepared an email draft.\nTo: ada@example.com\nSubject: Status\n\nAll good.',
        messageId: crypto.randomUUID(),
        userMessageId: crypto.randomUUID(),
        messageBinding: {conversationId: f.room, session: f.session},
      };
    };
    f.shell.stageAgentEmailDraft = async () => f.turnMode === 'email';
    f.turnMode = 'proposal';
    f.prompt = 'Move lunch to 1pm';
  });

  await utterance(page);
  await expect(ownedVoice(page)).toHaveAttribute('data-voice-state', 'speaking');
  await page.evaluate(() => (window as any).ownedVoiceNavigation.finishPlayback());
  await expect(ownedVoice(page)).toHaveAttribute('data-voice-state', 'listening');
  await expect(ownedVoice(page)).not.toContainText('Mic off');

  // 2. Pending notice with empty spoken reply text
  await page.evaluate(() => {
    const f = (window as any).ownedVoiceNavigation;
    f.turnMode = 'notice';
    f.prompt = 'Create a reminder';
  });
  await utterance(page);
  await expect(ownedVoice(page)).toHaveAttribute('data-voice-state', 'speaking');
  await page.evaluate(() => (window as any).ownedVoiceNavigation.finishPlayback());
  await expect(ownedVoice(page)).toHaveAttribute('data-voice-state', 'listening');

  // 3. Email draft review card
  await page.evaluate(() => {
    const f = (window as any).ownedVoiceNavigation;
    f.turnMode = 'email';
    f.prompt = 'Draft an email to Ada';
  });
  await utterance(page);
  await expect(ownedVoice(page)).toHaveAttribute('data-voice-state', 'speaking');
  await page.evaluate(() => (window as any).ownedVoiceNavigation.finishPlayback());
  await expect(ownedVoice(page)).toHaveAttribute('data-voice-state', 'listening');
});

test('Bug 3b/3c: open_view, presentBrowser, files_open, Maps relay, and in-place context refresh keep voice active', async ({page}) => {
  test.slow();
  await page.route('**/src/runtime/connection-ui.tsx*', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      /setDeviceExecutor\(executor[^)]*\)\s*\{\s*deviceExecutor = executor;/,
      match => `${match} globalThis.__installedDeviceExecutor = executor;`,
    );
    await route.fulfill({response, body});
  });
  await setupOwnedVoice(page, 'sheet', true);
  await page.evaluate(async () => {
    const f = (window as any).ownedVoiceNavigation;
    const {alphaClient} = await import('/src/runtime/alpha-client.ts');
    const transport = (alphaClient as any).transport;
    const execute = (window as any).__installedDeviceExecutor;
    if (typeof execute !== 'function') throw new Error('Missing __installedDeviceExecutor');
    f.shell.browserNavigateApproved = async () => () => {
      // Exact browser-adapter.ts:712 call signature (chat override null, restore: true).
      f.shell.openView('browser', null, null, {restore: true});
    };
    f.shell.filesAgent = {
      run: async (_op: any, _sig: AbortSignal, openFiles: () => Promise<boolean>) => {
        const opened = await openFiles();
        if (!opened) return {status: 'failed', summary: 'Could not open Files.'};
        return {status: 'succeeded', summary: 'Opened the file in Files.'};
      },
    };
    const send = transport.send;
    transport.send = async (input: any) => {
      if (f.caseMode === 'open_view') {
        const res = await execute({type: 'open_view', view: 'notes'}, 'op-ov-1', input.context, input.signal, 'proposal-ov-1');
        if (res?.status !== 'succeeded') throw new Error(`open_view failed: ${JSON.stringify(res)}`);
      } else if (f.caseMode === 'browser_navigate') {
        const res = await execute({type: 'browser_navigate', url: 'https://example.invalid/'}, 'op-bn-1', input.context, input.signal, 'proposal-bn-1');
        res.presentBrowser?.();
      } else if (f.caseMode === 'files_open') {
        const res = await execute({type: 'files_open', path: 'notice.txt'}, 'op-fo-1', input.context, input.signal, 'proposal-fo-1');
        if (res?.status !== 'succeeded') throw new Error(`files_open failed: ${JSON.stringify(res)}`);
      } else if (f.caseMode === 'maps_open') {
        alphaClient.admitOwnViewOpen('maps');
        await f.shell.runOwnedVoiceViewNavigation('maps', (detent?: string) => {
          f.shell.openView('maps', undefined, detent);
          return new Promise<void>(resolve => f.shell.setState({}, resolve));
        });
      }
      f.answer = `Handled ${f.caseMode}.`;
      return await send(input);
    };
  });

  // 1. open_view -> notes
  await page.evaluate(() => { const f = (window as any).ownedVoiceNavigation; f.caseMode = 'open_view'; f.prompt = 'Open notes'; });
  await utterance(page);
  await expect(page.locator('html')).toHaveAttribute('data-active-view', 'notes');
  await expect(ownedVoice(page)).toHaveAttribute('data-voice-state', 'speaking');
  await page.evaluate(() => (window as any).ownedVoiceNavigation.finishPlayback());
  await expect(ownedVoice(page)).toHaveAttribute('data-voice-state', 'listening');

  // 2. Bug 3c: in-place Notes context refresh while staying on Notes
  await page.evaluate(async () => {
    const {alphaClient} = await import('/src/runtime/alpha-client.ts');
    const prev = alphaClient.getState().context;
    alphaClient.setViewContext({...prev, selectedObject: {kind: 'note', id: 'note-1', revision: 'rev-2'}});
    await new Promise(resolve => setTimeout(resolve, 30));
  });
  await expect(ownedVoice(page)).toHaveAttribute('data-voice-state', 'listening');

  // 3. browser_navigate / presentBrowser -> browser (even with browser-adapter's chat=null openView)
  await page.evaluate(() => { const f = (window as any).ownedVoiceNavigation; f.caseMode = 'browser_navigate'; f.prompt = 'Open example site'; });
  await utterance(page);
  await expect(page.locator('html')).toHaveAttribute('data-active-view', 'browser');
  await expect(ownedVoice(page)).toHaveAttribute('data-voice-state', 'speaking');
  await page.evaluate(() => (window as any).ownedVoiceNavigation.finishPlayback());
  await expect(ownedVoice(page)).toHaveAttribute('data-voice-state', 'listening');

  // 4. files_open -> files
  await page.evaluate(() => { const f = (window as any).ownedVoiceNavigation; f.caseMode = 'files_open'; f.prompt = 'Open notice.txt'; });
  await utterance(page);
  await expect(page.locator('html')).toHaveAttribute('data-active-view', 'files');
  await expect(ownedVoice(page)).toHaveAttribute('data-voice-state', 'speaking');
  await page.evaluate(() => (window as any).ownedVoiceNavigation.finishPlayback());
  await expect(ownedVoice(page)).toHaveAttribute('data-voice-state', 'listening');

  // 5. Maps relay -> maps
  await page.evaluate(() => { const f = (window as any).ownedVoiceNavigation; f.caseMode = 'maps_open'; f.prompt = 'Navigate in Maps'; });
  await utterance(page);
  await expect(page.locator('html')).toHaveAttribute('data-active-view', 'maps');
  await expect(ownedVoice(page)).toHaveAttribute('data-voice-state', 'speaking');
  await page.evaluate(() => (window as any).ownedVoiceNavigation.finishPlayback());
  await expect(ownedVoice(page)).toHaveAttribute('data-voice-state', 'listening');

  // 6. Legitimate stop preserved: manual user navigation still retires voice
  await page.evaluate(() => {
    const f = (window as any).ownedVoiceNavigation;
    f.shell.openView('calendar');
  });
  await expect(page.locator('html')).toHaveAttribute('data-active-view', 'calendar');
  await expect(ownedVoice(page)).toHaveCount(0);
});
