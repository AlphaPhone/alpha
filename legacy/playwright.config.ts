import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import { defineConfig, devices } from '@playwright/test';
import { storageSpecPattern } from './scripts/storage-specs.ts';
import { scaledTimeout } from './specs/quint/refinement/timeouts.mjs';
const port=Number(process.env.ALPHA_BROWSER_TEST_PORT||5317);
const productionPort=port+1;
const productionOutput=`test-results/production-web-${productionPort}`;
// Concurrent runs in one worktree need different ports (the servers use --strictPort), so the port
// keys everything a run writes: results, the HTML report and the servers' Vite dependency caches.
// The default port keeps the plain paths that CI uploads.
const runSuffix=port===5317?'':`-${port}`;
const webServerTimeout=scaledTimeout(180_000);
// The production lane runs production-surface.spec.ts and every <name>.production.spec.ts.
const productionSpec=/(production-surface|\.production)\.spec\.ts$/;
// Live specs need a running local agent and real providers; only the live project runs them
// (bun run test:browser:live).
const liveSpec=/\.local\.spec\.ts$/;

// The top-level webServer list is not per-project. Start only the servers that the
// selected projects use, so the default lane never builds and the production lane
// never starts a flag-on development server.
const selected=(()=>{
  const names:string[]=[];const argv=process.argv;
  for(let index=0;index<argv.length;index++){
    if(argv[index]==='--project'&&argv[index+1])names.push(argv[++index]);
    else if(argv[index].startsWith('--project='))names.push(argv[index].slice('--project='.length));
  }
  return names;
})();
// A file with a fake-audio capture for the live voice specs; without it they need a physical microphone.
const fakeAudio=process.env.ALPHA_LIVE_FAKE_AUDIO;
const needsProduction=!selected.length||selected.includes('production');
const needsDevelopment=!selected.length||selected.some(name=>name!=='production');
const needsChromiumWarmup=!selected.length||selected.some(name=>name==='chromium'||name==='live');
// Specs that start their own in-process Vite server (dev-hosted-journey, dev-reload,
// reading-source) read the flag from the worker environment, so development lanes opt in
// here too. The production web server below clears it explicitly.
if(needsDevelopment)process.env.ELIZA_DEV_ALLOW_TEST_MOCKS='1';

// Tests must never inherit the human preview’s private Cloud account profile.
const browserTestCloudProfile=join(tmpdir(),`alpha-browser-cloud-test-${randomUUID()}`);
const development={
  // The development server explicitly opts into test mocks, fixtures and device controls.
  command: `bun run dev:ui -- --configLoader runner --port ${port} --strictPort`, url: `http://127.0.0.1:${port}`, reuseExistingServer: false, timeout: webServerTimeout,
  env: { ELIZA_DEV_ALLOW_TEST_MOCKS: '1', ALPHA_BROWSER_CLOUD_PROFILE: browserTestCloudProfile, ALPHA_VITE_CACHE_SCOPE: String(port) },
};
const production={
  // A flag-off production build served by vite preview: no mocks, fixtures or developer surfaces.
  // It is written outside web-dist so it never replaces a release or test-mocks build.
  command: `bun run upstream:prepare-client && bunx --bun vite build --outDir ../../${productionOutput} && bun scripts/audit-production-bundle.ts ${productionOutput} && node node_modules/vite/bin/vite.js preview --outDir ../../${productionOutput} --host 127.0.0.1 --port ${productionPort} --strictPort`,
  url: `http://127.0.0.1:${productionPort}`, reuseExistingServer: false, timeout: webServerTimeout,
  env: { ELIZA_DEV_ALLOW_TEST_MOCKS: '', VITE_LOCAL_AGENT: '', ALPHA_VITE_CACHE_SCOPE: String(productionPort) },
};

export default defineConfig({
  testDir: './test/browser',
  // A committed test.only would turn a shard green while skipping the rest.
  forbidOnly: true,
  // Warm Chromium development runs before workers start. Storage jobs install their own browser only.
  globalSetup: needsChromiumWarmup ? './test/browser/warm-dev-server.ts' : undefined,
  timeout: 30_000,
  // Measured on the 24-CPU development host (standalone-shell, accessibility-lifecycle and
  // dev-inbox, 102 tests): 2 workers 182 s, 4 workers 95 s, 6 workers 75 s. Only 4 kept every test
  // passing while other sessions loaded the host; 6 and 8 timed out timing-sensitive tests.
  // ALPHA_BROWSER_WORKERS (or --workers) overrides it. CI keeps 2 per shard until its runners are measured.
  workers: Number(process.env.ALPHA_BROWSER_WORKERS) || (process.env.CI ? 2 : 4),
  fullyParallel: true,
  reporter: [['list'], ['html', { outputFolder: `test-results/browser-report${runSuffix}`, open: 'never' }]],
  outputDir: `test-results/browser${runSuffix}`,
  // Motion stays at the browser default: many specs measure transitions and settled geometry.
  // `reducedMotion` is not a Playwright test option (a bare `use.reducedMotion` is ignored);
  // a spec that needs it opts in with test.use({contextOptions:{reducedMotion:'reduce'}}).
  use: { baseURL: `http://127.0.0.1:${port}`, viewport: { width: 412, height: 915 }, screenshot: 'only-on-failure',
    // A failure keeps its trace: actions with their timings and errors, screencast and console.
    // DOM snapshots and the network log (Playwright records both only with snapshots, including
    // every module body the dev server sends) cost every test about a second and are discarded
    // when it passes, so they are recorded only with ALPHA_TRACE=1.
    trace: process.env.ALPHA_TRACE === '1' ? 'retain-on-failure' : { mode: 'retain-on-failure', snapshots: false } },
  projects: [
    { name: 'chromium', testIgnore: [productionSpec, liveSpec] },
    { name: 'production', testMatch: productionSpec, use: { baseURL: `http://127.0.0.1:${productionPort}` } },
    { name: 'firefox', testMatch: storageSpecPattern, use: { ...devices['Desktop Firefox'], baseURL: `http://127.0.0.1:${port}`, viewport: { width: 412, height: 915 } } },
    { name: 'webkit', testMatch: storageSpecPattern, use: { ...devices['Desktop Safari'], baseURL: `http://127.0.0.1:${port}`, viewport: { width: 412, height: 915 } } },
    ...(selected.includes('live')?[{ name: 'live', testMatch: liveSpec, use: { permissions: ['microphone'], launchOptions: { args: fakeAudio?['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',`--use-file-for-fake-audio-capture=${fakeAudio}`]:[] } } }]:[]),
  ],
  webServer: [...(needsDevelopment?[development]:[]),...(needsProduction?[production]:[])],
});
