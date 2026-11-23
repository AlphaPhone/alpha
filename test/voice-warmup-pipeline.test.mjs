import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {createVoiceSessionClient} from '../apps/app/src/ui/voice/voice-session-client-core.ts';
import {AlphaClient} from '../apps/app/src/runtime/alpha-client.ts';

test('local-voice ready forwards ttsOnly: true when requested so live conversation does not load Phonon-2 in Context #1', async () => {
  const statusCalls = [];
  const bundle = await build({
    entryPoints: ['apps/app/src/runtime/local-voice.ts'],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    plugins: [{
      name: 'mock-local-voice-ports',
      setup(pluginBuild) {
        pluginBuild.onResolve({filter: /^@capacitor\/core$/}, () => ({path: 'cap', namespace: 'mock'}));
        pluginBuild.onLoad({filter: /.*/, namespace: 'mock'}, () => ({
          contents: `
            export const Capacitor = {
              isNativePlatform: () => true,
              isPluginAvailable: () => true,
            };
          `,
          loader: 'js',
        }));
        pluginBuild.onResolve({filter: /platform-plugins$/}, () => ({path: 'plugins', namespace: 'mock-plugins'}));
        pluginBuild.onLoad({filter: /.*/, namespace: 'mock-plugins'}, () => ({
          contents: `
            export function registerPlugin() {
              return globalThis.__mockAlphaVoiceCloud;
            }
          `,
          loader: 'js',
        }));
        pluginBuild.onResolve({filter: /connection-ui$/}, () => ({path: 'conn', namespace: 'mock-conn'}));
        pluginBuild.onLoad({filter: /.*/, namespace: 'mock-conn'}, () => ({
          contents: `
            export const connectionController = {
              getSnapshot: () => ({open: false, session: {sessionId: 's-1'}}),
              getCloudClient: () => null,
              subscribe: () => () => {},
            };
          `,
          loader: 'js',
        }));
        pluginBuild.onResolve({filter: /local-speech-playback$/}, () => ({path: 'playback', namespace: 'mock-playback'}));
        pluginBuild.onLoad({filter: /.*/, namespace: 'mock-playback'}, () => ({
          contents: 'export async function speakLocalText() {}',
          loader: 'js',
        }));
      },
    }],
  });

  const prevDoc = globalThis.document;
  const prevVoice = globalThis.__mockAlphaVoiceCloud;
  globalThis.document = {
    hidden: false,
    documentElement: {dataset: {connectionMode: 'native'}},
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.__mockAlphaVoiceCloud = {
    async localSpeechStatus(input) {
      statusCalls.push(input);
      return {ready: true, execution: 'device'};
    },
    async transcribeLocalRecording() { return {text: '', local: true, execution: 'device'}; },
    async transcribeLocalAudio() { return {text: '', local: true, execution: 'device'}; },
    async releaseLocalSpeech() {},
    async cancel() {},
  };

  try {
    const modUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text, 'utf8').toString('base64')}`;
    const {createOnDeviceVoice} = await import(modUrl);
    const local = createOnDeviceVoice();
    assert.ok(local);
    const ac = new AbortController();
    assert.equal(await local.ready(ac.signal, {ttsOnly: true}), true);
    assert.equal(statusCalls.length, 1);
    assert.equal(statusCalls[0].ttsOnly, true);
    assert.equal(await local.ready(ac.signal), true);
    assert.equal(statusCalls[1].ttsOnly, undefined);
  } finally {
    globalThis.document = prevDoc;
    globalThis.__mockAlphaVoiceCloud = prevVoice;
  }
});

test('VoiceSessionClient starts mic capture immediately in parallel with mint/WS ready and flushes buffered PCM on ready', async () => {
  let resolveMint;
  const mintDeferred = new Promise(resolve => { resolveMint = resolve; });
  const events = [];
  const sentBinary = [];
  let getUserMediaCalls = 0;
  let scriptNode = null;
  let activeSocket = null;
  let micTrackEnded = false;

  const fakeFetch = async (url) => {
    events.push(`fetch:${url}`);
    if (String(url).includes('/api/v1/voice/session/consent')) {
      return {ok: true, status: 200, async json() { return {consentNonce: 'nonce-1'}; }};
    }
    if (String(url).includes('/api/v1/voice/session')) {
      return await mintDeferred;
    }
    throw new Error(`Unexpected fetch ${url}`);
  };

  class FakeWs extends EventTarget {
    constructor(url) {
      super();
      this.url = url;
      this.binaryType = 'blob';
      activeSocket = this;
      events.push('ws:construct');
      queueMicrotask(() => {
        events.push('ws:open');
        this.dispatchEvent(new Event('open'));
      });
    }
    send(data) {
      if (typeof data === 'string') {
        events.push(`ws:send:${JSON.parse(data).t}`);
      } else {
        sentBinary.push(new Uint8Array(data));
      }
    }
    close() {
      this.dispatchEvent(new MessageEvent('close', {data: {code: 1000, reason: 'closed'}}));
    }
  }

  const fakeAudioNode = {connect() { return fakeAudioNode; }, disconnect() {}};
  const createMicAudioContext = () => ({
    sampleRate: 16000,
    state: 'running',
    destination: fakeAudioNode,
    createMediaStreamSource: () => fakeAudioNode,
    createScriptProcessor: () => {
      scriptNode = {
        connect() { return fakeAudioNode; },
        disconnect() {},
        onaudioprocess: null,
      };
      return scriptNode;
    },
    async resume() {},
    async close() {},
  });

  const createPlaybackAudioContext = () => ({
    sampleRate: 16000,
    state: 'running',
    baseLatency: 0.01,
    destination: fakeAudioNode,
    createGain: () => ({gain: {value: 1, setValueAtTime() {}}, connect() { return fakeAudioNode; }, disconnect() {}}),
    createScriptProcessor: () => ({connect() { return fakeAudioNode; }, disconnect() {}, onaudioprocess: null}),
    async resume() {},
    async close() {},
  });

  const fakeStream = {
    getTracks: () => [{
      kind: 'audio',
      enabled: true,
      get readyState() { return micTrackEnded ? 'ended' : 'live'; },
      stop() { micTrackEnded = true; },
    }],
  };

  const client = createVoiceSessionClient({
    getConsentNonce: async () => {
      events.push('consent');
      return 'nonce-1';
    },
    fetch: fakeFetch,
    webSocketFactory: url => new FakeWs(url),
    getUserMedia: async () => {
      getUserMediaCalls++;
      events.push('getUserMedia');
      return fakeStream;
    },
    createMicAudioContext,
    createPlaybackAudioContext,
    onTraceMark: mark => events.push(`mark:${mark.name}`),
    onError: error => { throw error; },
  });

  const startPromise = client.start();
  try {
    for (let i = 0; i < 20 && !scriptNode?.onaudioprocess; i++) {
      await new Promise(resolve => setTimeout(resolve, 5));
    }

    // Mic capture MUST already be active before mint resolves and before WS connects!
    assert.equal(getUserMediaCalls, 1, `expected parallel capture before mint; events=${events.join(',')}`);
    assert.ok(scriptNode?.onaudioprocess, 'mic ScriptProcessor handler must be live while mint is pending');

    // Feed non-zero PCM audio BEFORE mint / WS ready.
    const inputSamples = new Float32Array(1600).fill(0.25);
    scriptNode.onaudioprocess({inputBuffer: {getChannelData: () => inputSamples}});
    assert.equal(sentBinary.length, 0, 'frames captured before ready must be queued, not sent before handshake');

    // Resolve mint now and complete WS ready handshake.
    resolveMint({
      ok: true,
      status: 200,
      async json() {
        return {
          sessionId: 'sess-1',
          token: 'tok-1',
          expiresAt: Date.now() + 60_000,
          wsUrl: 'wss://voice.invalid/ws',
          uplink: {codecs: ['pcm16']},
          downlink: {codecs: ['pcm16']},
        };
      },
    });
    await startPromise;
    for (let i = 0; i < 20 && !events.includes('ws:send:hello'); i++) {
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    assert.ok(activeSocket, 'WS socket opened after mint');
    activeSocket.dispatchEvent(new MessageEvent('message', {
      data: JSON.stringify({t: 'ready', sessionId: 'sess-1', traceId: 't0', resumed: false}),
    }));
    await new Promise(resolve => setTimeout(resolve, 10));

    assert.ok(sentBinary.length >= 1, `queued pre-ready PCM frames must flush once ready arrives; sentBinary=${sentBinary.length}`);
    const sample0 = new Int16Array(sentBinary[0].buffer, sentBinary[0].byteOffset, sentBinary[0].byteLength / 2)[0];
    assert.ok(sample0 > 1000, `early buffered audio must NOT be muted to zero (got sample0=${sample0})`);
  } finally {
    await client.stop();
  }
  assert.equal(micTrackEnded, true);
});

test('VoiceSessionClient discards pre-ready buffered PCM cleanly when stopped before ready', async () => {
  let resolveMint;
  const mintDeferred = new Promise(resolve => { resolveMint = resolve; });
  const sentBinary = [];
  let scriptNode = null;
  let micTrackEnded = false;
  const fakeAudioNode = {connect() { return fakeAudioNode; }, disconnect() {}};
  const client = createVoiceSessionClient({
    getConsentNonce: async () => 'nonce-cancel',
    fetch: async () => await mintDeferred,
    webSocketFactory: () => {
      const ws = new EventTarget();
      ws.binaryType = 'blob';
      ws.send = data => { if (typeof data !== 'string') sentBinary.push(data); };
      ws.close = () => {};
      return ws;
    },
    getUserMedia: async () => ({
      getTracks: () => [{
        kind: 'audio',
        enabled: true,
        get readyState() { return micTrackEnded ? 'ended' : 'live'; },
        stop() { micTrackEnded = true; },
      }],
    }),
    createMicAudioContext: () => ({
      sampleRate: 16000,
      state: 'running',
      destination: fakeAudioNode,
      createMediaStreamSource: () => fakeAudioNode,
      createScriptProcessor: () => {
        scriptNode = {connect() { return fakeAudioNode; }, disconnect() {}, onaudioprocess: null};
        return scriptNode;
      },
      async resume() {},
      async close() {},
    }),
    createPlaybackAudioContext: () => ({
      sampleRate: 16000,
      state: 'running',
      baseLatency: 0.01,
      destination: fakeAudioNode,
      createGain: () => ({gain: {value: 1, setValueAtTime() {}}, connect() { return fakeAudioNode; }, disconnect() {}}),
      createScriptProcessor: () => ({connect() { return fakeAudioNode; }, disconnect() {}, onaudioprocess: null}),
      async resume() {},
      async close() {},
    }),
    onError: () => {},
  });

  const startPromise = client.start();
  for (let i = 0; i < 20 && !scriptNode?.onaudioprocess; i++) {
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  scriptNode.onaudioprocess({inputBuffer: {getChannelData: () => new Float32Array(1600).fill(0.25)}});
  await client.stop();
  resolveMint({ok: false, status: 503, async json() { return {}; }, async text() { return ''; }});
  await startPromise.catch(() => {});
  assert.equal(micTrackEnded, true);
  assert.equal(sentBinary.length, 0);
});

test('AlphaVoiceCloudPlugin prewarms on load/resume and AlphaLocalAgentPlugin uses fast initial boot polling', () => {
  const voicePlugin = fs.readFileSync('android/app/src/main/java/ai/alphacompute/alphaphone/AlphaVoiceCloudPlugin.java', 'utf8');
  const agentPlugin = fs.readFileSync('android/app/src/main/java/ai/alphacompute/alphaphone/AlphaLocalAgentPlugin.java', 'utf8');
  assert.match(voicePlugin, /\bvoid load\s*\(/, 'AlphaVoiceCloudPlugin must override load() for startup voice prewarm');
  assert.match(voicePlugin, /\bvoid handleOnResume\s*\(/, 'AlphaVoiceCloudPlugin must override handleOnResume() for foreground prewarm');
  assert.match(voicePlugin, /VoiceBundleAssets\.install\b|VoiceAssets\.install\b/, 'AlphaVoiceCloudPlugin prewarm must install/warm voice assets in background');
  assert.doesNotMatch(agentPlugin, /long pause=1000\b/, 'AlphaLocalAgentPlugin startup polling must not sleep 1000ms before checking health');
  assert.match(agentPlugin, /long pause=50\b/, 'AlphaLocalAgentPlugin startup polling must begin with 50ms checks');
});

test('AlphaClient.admitOwnContextRefresh preserves continuesContext on same-view refresh while still retiring on view switch or sensitive surface', () => {
  const client = new AlphaClient();
  client.setViewContext({view: 'notes', timeZone: 'UTC'});
  const initial = client.getState().context;
  client.admitOwnContextRefresh('notes', 5000);
  client.setViewContext({view: 'notes', timeZone: 'UTC', selectedObject: {kind: 'note', id: 'n1', revision: 'r1'}});
  const afterRefresh = client.getState().context;
  assert.ok(afterRefresh.revision > initial.revision);
  assert.equal(client.continuesContext(initial), true, 'in-place refresh on admitted view must continue context');
  assert.equal(client.continuesContext(afterRefresh), true);

  // Leaving to another view breaks the chain immediately.
  client.setViewContext({view: 'calendar', timeZone: 'UTC'});
  assert.equal(client.continuesContext(initial), false, 'leaving view must end context continuation');
  assert.equal(client.continuesContext(afterRefresh), false);

  // Sensitive surface breaks the chain even when same view was admitted.
  const cal = client.getState().context;
  client.admitOwnContextRefresh('calendar', 5000);
  client.setViewContext({view: 'calendar', timeZone: 'UTC', sensitive: true});
  assert.equal(client.continuesContext(cal), false, 'sensitive screen must never be admitted as own refresh');
});
