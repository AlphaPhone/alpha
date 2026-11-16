import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import {filesWithin, relativePath, sourcePaths} from '../../../../scripts/quint-lib.ts';
import {captureInputs, checkTraces, qset} from '../check-traces.mjs';
import {scaledTimeout} from '../timeouts.mjs';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const settings = resolve(root, 'apps/app/src/prototype/settings-adapter.ts');
const main = resolve(root, 'apps/app/src/main.tsx');
const logPort = '\0settings-diagnostic-log-port';
const logImport = 'virtual:settings-diagnostic-log-port';

function observePorts() {
  const statusReads = new Map(), logReads = new Map(), refreshes = new Map();
  let issued = 0, nextLog, armedRefresh = 0;
  // The page clock is paused, so yielding uses a message task, which the clock does not control.
  const yieldTask = () => new Promise(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => { channel.port1.close(); resolve(); };
    channel.port2.postMessage(0);
  });
  return {
    // The next ordinary refresh() is held after all its reads (including its log snapshot) return.
    armRefresh(token) { armedRefresh = token; },
    holdRefresh(reads) {
      if (!armedRefresh) return reads;
      const token = armedRefresh;
      armedRefresh = 0;
      return new Promise(release => refreshes.set(token, {reads, release}));
    },
    async settleRefresh(token) {
      const read = refreshes.get(token);
      if (!read) throw Error('Missing refresh: ' + JSON.stringify(this.observe()));
      refreshes.delete(token);
      read.release(await read.reads);
      await yieldTask();
    },
    request(signal) {
      const token = ++issued;
      return new Promise(settle => statusReads.set(token, {signal, settle}));
    },
    async settleStatus(token, hasFailure) {
      const read = statusReads.get(token);
      if (!read) throw Error('Missing diagnostic request');
      statusReads.delete(token);
      if (hasFailure) nextLog = {token, signal: read.signal};
      read.settle(hasFailure ? {cloudInferenceFailure: {
        version: 1, at: Date.now() + token, stage: 'text', reason: 'transport',
        strictTools: [], schemaKeywords: [], schemaScanTruncated: false, schemaDepth: token,
      }} : null);
      await yieldTask();
      nextLog = undefined;
    },
    holdLog() {
      if (!nextLog) return;
      const {token, signal} = nextLog;
      nextLog = undefined;
      return new Promise(settle => logReads.set(token, {signal, settle}));
    },
    async settleLog(token) {
      const read = logReads.get(token);
      if (!read) throw Error('Missing log request: ' + JSON.stringify(this.observe()));
      logReads.delete(token);
      read.settle();
      await yieldTask();
    },
    observe() {
      const recorded = (JSON.parse(localStorage.getItem('alpha.crash-log.v1') || '{}').entries || [])
        .filter(row => row.source === 'inference').map(row => row.inference.schemaDepth);
      // The adapter's published crash log, which the Problem log renders. It outlives the React
      // root, so a publish after the owner unmounts stays observable.
      const shown = (globalThis.quintSettingsCrashLog?.()?.entries || [])
        .filter(row => row.source === 'inference').map(row => row.inference.schemaDepth);
      return {statusReads: [...statusReads.keys()], logReads: [...logReads.keys()], refreshes: [...refreshes.keys()], recorded, shown,
        aborted: [...statusReads, ...logReads].filter(([, read]) => read.signal.aborted).map(([token]) => token)};
    },
  };
}

export async function checkSettingsResidentDiagnostics(extraSources = []) {
  const sources = [...new Set([...sourcePaths(), 'vite.config.ts', 'package.json', 'bun.lock', 'scripts/quint-lib.ts',
    'upstream.lock.json', 'scripts/prepare-client-features.ts', fileURLToPath(import.meta.url),
    ...filesWithin(resolve(root, '.eliza/client-features'), path => /\.(?:ts|tsx|js|json|css|html)$/.test(path)).map(relativePath),
    ...extraSources])];
  const driverHashes = captureInputs(sources);
  const loaded = new Set();
  const prior = process.env.ELIZA_DEV_ALLOW_TEST_MOCKS;
  let server, browser;
  try {
    process.env.ELIZA_DEV_ALLOW_TEST_MOCKS = '1';
    server = await createServer({configLoader: 'runner', root: resolve(root, 'apps/app'), configFile: resolve(root, 'vite.config.ts'),
      logLevel: 'error', cacheDir: resolve(root, 'test-results/quint-refinement/settings-diagnostics-cache'),
      server: {host: '127.0.0.1', port: 0, strictPort: false, hmr: false},
      define: {'import.meta.env.VITE_ELIZA_DEV_ALLOW_TEST_MOCKS': JSON.stringify('1')},
      plugins: [{name: 'settings-diagnostic-ports', enforce: 'pre',
        resolveId(id) {
          if (id === logImport) return logPort;
        },
        load(id) {
          if (id !== logPort) return;
          return `
            export * from '/src/runtime/crash-log.ts';
            import {readCrashLog as read} from '/src/runtime/crash-log.ts';
            export async function readCrashLog() {
              await globalThis.quintDiagnostics?.holdLog();
              return read();
            }
          `;
        },
        transform(code, id) {
          const path = id.split('?')[0];
          if (path.startsWith(root) && !path.includes('/node_modules/') && existsSync(path)) {
            loaded.add(path);
            if (!driverHashes[path]) Object.assign(driverHashes, captureInputs([path]));
          }
          if (path === settings) {
            const patches = [
              ["'../runtime/crash-log'", JSON.stringify(logImport)],
              ['let crashLog: CrashLog | null = null, crashBusy = false, diagnosticsBusy = false;',
                'let crashLog: CrashLog | null = null, crashBusy = false, diagnosticsBusy = false; globalThis.quintSettingsCrashLog = () => crashLog;'],
              ['storage] = await Promise.allSettled([', 'storage] = await globalThis.quintDiagnostics.holdRefresh(Promise.allSettled(['],
              ['connectionController.refreshProviderStatus() : Promise.resolve()]);', 'connectionController.refreshProviderStatus() : Promise.resolve()]));'],
            ];
            for (const [from, to] of patches) {
              if (code.split(from).length !== 2) throw Error('Settings adapter port anchor changed: ' + from);
              code = code.replace(from, to);
            }
            return code;
          }
          if (path === main) return code
            .replace('shell = value;', 'shell = value; window.quintSettingsShell = value;')
            .replace("createRoot(document.getElementById('root')!).render(",
              "(window.quintSettingsRoot = createRoot(document.getElementById('root')!)).render(");
        },
      }]});
  } finally {
    if (prior === undefined) delete process.env.ELIZA_DEV_ALLOW_TEST_MOCKS;
    else process.env.ELIZA_DEV_ALLOW_TEST_MOCKS = prior;
  }

  const traces = [];
  try {
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await chromium.launch({headless: true});

    async function scenario(name, drive) {
      const page = await browser.newPage({viewport: {width: 412, height: 915}});
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.setDefaultTimeout(scaledTimeout(25_000));
      await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
      await page.addInitScript(`
        localStorage.setItem('alpha.connection.selection.v1', JSON.stringify({kind:'offline'}));
        window.quintDiagnostics = (${observePorts.toString()})();
      `);
      try {
        await page.clock.install({time: new Date('2027-01-02T12:00:00Z')});
        await page.goto(origin + '/?mode=dev&tools=1');
        await page.waitForFunction(() => window.quintSettingsShell?.live && window.quintSettingsRoot);
        await page.evaluate(async () => {
          const {connectionController} = await import('/src/runtime/connection-ui.tsx');
          connectionController.readResidentDiagnostics = window.quintDiagnostics.request;
        });
        async function observe() {
          const state = await page.evaluate(() => window.quintDiagnostics.observe());
          const reads = tokens => qset(tokens.map(token => ({token, instance: 1})));
          return {'s.diagnostics.statusReads': reads(state.statusReads), 's.diagnostics.logReads': reads(state.logReads),
            's.diagnostics.refreshes': qset(state.refreshes),
            's.diagnostics.aborted': qset(state.aborted), 's.diagnostics.recorded': qset(state.recorded),
            's.diagnostics.shown': qset(state.shown)};
        }
        const trace = {name, expect: await observe(), steps: []};
        const mark = async (label, name, ...args) => trace.steps.push({label, action: {name, args}, expect: await observe()});
        await mark('Shell mounts before an explicit read', 'mount');
        await page.evaluate(() => window.quintSettingsShell.openView('settings'));
        await page.waitForFunction(() => document.documentElement.dataset.activeView === 'settings');
        await mark('Settings is in front', 'openSettings');
        // From here page timers fire only when a step advances the clock, so the ten-second
        // diagnostic deadline cannot run out on a slow host.
        await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 1000);

        await drive({
          async start(token) {
            await page.evaluate(() => window.quintSettingsShell.vset('settings', {page: 'developer'}));
            await page.evaluate(token => window.quintDiagnostics.armRefresh(token), token);
            await page.getByRole('button', {name: /^Problem log(?:, \d+)?$/}).click();
            await page.waitForFunction(token => window.quintDiagnostics.observe().statusReads.includes(token)
              && window.quintDiagnostics.observe().refreshes.includes(token), token);
            await mark('Problem log opens an actual status request', 'startDiagnostic');
          },
          async status(token) {
            await page.evaluate(token => window.quintDiagnostics.settleStatus(token, true), token);
            await mark('Resident failure reaches the held status port', 'diagnosticStatusSettles', {token, instance: 1}, true);
          },
          async log(token, visible = false) {
            await page.evaluate(token => window.quintDiagnostics.settleLog(token), token);
            if (visible) await page.getByText(new RegExp(`Depth ${token}`)).waitFor();
            await mark('Local log read returns at its asynchronous boundary', 'diagnosticLogSettles', {token, instance: 1}, true);
          },
          async refresh(token, visible) {
            await page.evaluate(token => window.quintDiagnostics.settleRefresh(token), token);
            // The rendered Problem log still lists the failure the diagnostic published.
            if (visible) await page.getByText(new RegExp(`Depth ${visible}`)).waitFor();
            await mark('The tap\'s ordinary refresh returns with the log it read first', 'logRefreshSettles', token);
          },
          async limit(token) {
            await page.clock.fastForward(10_000);
            await page.waitForFunction(token => window.quintDiagnostics.observe().aborted.includes(token), token);
            await mark('Ten-second deadline aborts the held request', 'diagnosticLimit', token);
          },
          async unmount() {
            await page.evaluate(() => window.quintSettingsRoot.unmount());
            await mark('The real Settings owner unmounts', 'unmount');
          },
        });
        traces.push(trace);
      } finally {
        await page.close();
      }
      assert.deepEqual(errors, [], 'Mounted Settings has no uncaught browser errors');
    }

    await scenario('newer diagnostic status wins', async c => {
      await c.start(1);
      await c.start(2);
      await c.status(1);
      await c.status(2);
      await c.log(2, true);
      await c.refresh(1);
      await c.refresh(2, 2);
    });
    await scenario('diagnostic deadline drops late status', async c => {
      await c.start(1);
      await c.limit(1);
      await c.status(1);
      await c.refresh(1);
    });
    await scenario('old log cannot publish after the owner unmounts', async c => {
      await c.start(1);
      await c.status(1);
      await c.unmount();
      await c.log(1);
      await c.refresh(1);
    });
    await scenario('older ordinary refresh cannot hide the published failure', async c => {
      await c.start(1);
      await c.status(1);
      await c.log(1, true);
      await c.refresh(1, 1);
    });
  } finally {
    await browser?.close();
    await server.close();
  }

  return checkTraces({model: 'SettingsCapabilityReads', id: 'SettingsResidentDiagnostics', sources: [...sources, ...loaded],
    driverHashes, traces, scope: 'bounded-orchestration', assumptions: [
      'The real mounted Settings adapter, lifecycle and local crash-log recorder execute. Synthetic ports control resident status and the asynchronous return of the local log read.',
      'The model projection reads observed requests, their abort signals, the stored failure records and the adapter crash log the Problem log renders, which outlives an unmount. The fixture supplies unique timestamped failures.',
      'The Problem log tap\'s ordinary refresh() is held after all its reads return, so it publishes the log snapshot it read at the tap. The page clock is paused, so only the limit step fires the ten-second deadline.',
      'Only the explicit Problem log route is driven. Gmail correspondence, the export chooser, authentication and Android crash log storage are outside this projection.',
    ]});
}
