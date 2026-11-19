import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {captureInputs, checkTraces} from '../specs/quint/refinement/check-traces.mjs';

const model = 'PilotApkUpdate';
const modelPath = `specs/quint/services/${model}.qnt`;
const sources = [
  modelPath, fileURLToPath(import.meta.url), 'test/fixtures/pilot-update.mjs',
  'scripts/pilot-update.ts', 'scripts/android-instrumentation.ts', 'scripts/provision-unit.ts',
  'scripts/owner/pilot-install-lock.ts', 'scripts/apk.ts', 'scripts/build-android.ts',
  'scripts/toolchain.ts', 'scripts/release-blockers.ts',
  'vendor/eliza/packages/os/scripts/android/apk-release-record.mjs',
];
const action = (name, ...args) => ({name, args});

async function runPilotApkUpdateRefinement(extraSources = []) {
  const allSources = [...sources, ...extraSources];
  const driverHashes = captureInputs(allSources);
  const {planHome, updateUnit} = await import('../scripts/pilot-update.ts');
  const {claimPilotInstall} = await import('../scripts/owner/pilot-install-lock.ts');
  const {ALPHA, STOCK, APK, BEFORE, DATA, NONCE, exported, fakeUnit, timing} =
    await import('./fixtures/pilot-update.mjs');
  const stockPackage = STOCK.split('/')[0];
  const alphaActivity = `${ALPHA}/.MainActivity`;
  const homeOf = state => state.holder === ALPHA && state.activity === alphaActivity ? 'alpha'
    : state.holder === stockPackage && state.activity === STOCK ? 'stock' : 'split';
  const traces = [];

  function scenario(name, options = {}) {
    const {fault = null, alphaHome = true, runningAt, agentLog,
      passed = true, verified = true, attempted = true, agent = 'running'} = options;
    const f = fakeUnit({alphaHome, runningAt, agentLog});
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-pilot-model-'));
    const directory = path.join(root, 'locks');
    const device = 'a'.repeat(64);
    const lock = path.join(directory, `${device}.lock`);
    const trace = {name, init: action('initFor', homeOf(f.state) === 'alpha'), expect: {
      's.home': homeOf(f.state), 's.originalHome': homeOf(f.state), 's.locked': fs.existsSync(lock),
    }, steps: []};
    const record = (label, action, expect) => trace.steps.push({label, action, expect});
    const events = [];
    const snapshot = () => ({home: homeOf(f.state), pids: f.state.pids, integrity: f.state.integrity});
    const adb = args => {
      const event = {args, line: args.join(' '), before: snapshot()};
      events.push(event);
      try {
        if (args[0] === 'install' && fault === 'lost-install') throw new Error('simulated installer response loss');
        if (fault === 'partial-handoff' && args.includes('set-home-activity') && args.at(-1) === STOCK) return '';
        if (fault === 'restore-home' && args.includes('add-role-holder') && args.at(-1) === ALPHA) return '';
        if (fault === 'process-list' && args.includes('ps')) return '';
        const value = f.adb(args);
        if (fault === 'stuck-integrity' && args.includes('force-stop') && events.some(event => event.args[0] === 'install'))
          f.state.integrity = true;
        if (args.includes('content')) {
          if (fault === 'legacy-export') {
            f.state.integrity = false;
            return 'Unknown authority';
          }
          if (fault === 'changed-inventory' && events.some(event => event.args[0] === 'install'))
            return exported({...DATA, 'root-file': 'changed'}, NONCE);
          if (fault === 'home-takeover') {
            f.state.holder = ALPHA;
            f.state.activity = alphaActivity;
          }
        }
        return value;
      } finally {event.after = snapshot();}
    };

    let release;
    try {
      release = claimPilotInstall(directory, device, root);
      record('device lock is acquired by the actual lock', action('claimDevice'), {'s.locked': fs.existsSync(lock)});
      assert.throws(() => claimPilotInstall(directory, device, root), /lock is held/);
      record('competing claim is refused while the device lock exists', {...action('claimDevice'), reject: true}, {'s.locked': fs.existsSync(lock)});
      const home = planHome(adb);
      events.length = 0;
      const result = updateUnit({adb, apk: APK, before: BEFORE, home, nonce: NONCE, timing: {...timing, homeAttempts: 2}});
      assert.equal(result.passed, passed, result.failures.join('\n'));
      assert.equal(result.installAttempted, attempted, result.failures.join('\n'));
      assert.equal(result.installVerified, verified, result.failures.join('\n'));
      assert.equal(result.agentRestart?.state ?? 'unstarted', agent, result.failures.join('\n'));

      const move = events.findIndex(({args}) => args.includes('add-role-holder') && args.at(-1) === stockPackage);
      const selected = events.findIndex(({args}) => args.includes('set-home-activity') && args.at(-1) === STOCK);
      const beforeRead = events.findIndex(({args}) => args.includes('content'));
      const install = events.findIndex(({args}) => args[0] === 'install');
      const finalStop = events.findLastIndex(({args}) => args.includes('force-stop'));
      const finalProcess = events.find(({args}, index) => index > finalStop && args.includes('ps'));
      const restore = events.findIndex(({args}) => args.includes('add-role-holder') && args.at(-1) === ALPHA);
      const start = events.findIndex(({line}) => line.startsWith('shell am start'));
      assert.equal(install >= 0, result.installAttempted);
      assert.equal(move >= 0, result.home?.moved ?? false);
      assert.equal(start >= 0, result.agentRestart !== null);
      if (move >= 0) {
        assert.ok(selected > move);
        const observed = events[selected].after.home;
        record('role and resolved activity after the stock handoff', action('handoff', observed === 'stock'),
          {'s.home': observed, 's.moved': result.home.moved});
      }
      if (beforeRead >= 0) {
        const read = events[beforeRead];
        assert.equal(read.before.pids, '');
        assert.ok(beforeRead > selected);
        const evidence = result.dataReadback.domains ? 'inventory' : 'package-only';
        record('the pre-update export produced its recorded evidence class', action('readBefore', evidence),
          {'s.before': evidence, 's.home': read.before.home});
        if (read.before.home !== read.after.home)
          record('external HOME change during export', action('observeHome', read.after.home), {'s.home': read.after.home});
      }
      if (install >= 0) {
        const dispatch = events[install];
        assert.ok(install > beforeRead && beforeRead >= 0);
        assert.equal(dispatch.before.pids, '');
        record('actual install command crosses the effect boundary', action('dispatch'), {'s.home': dispatch.before.home});
        record('installer reply returned or remains unknown', action('installerReturned', result.installed),
          {'s.installer': result.installed ? 'returned' : 'unknown'});
        if (result.installed)
          record('admitted bytes, identity and inventory result', action('verifyReadback', result.installVerified), {'s.installVerified': result.installVerified});
      } else {
        record('source refuses to dispatch before cleanup', action('stopBeforeDispatch'), {'s.installer': 'not-dispatched'});
      }
      assert.ok(finalStop > install);
      const clean = Boolean(finalProcess) && !finalProcess.after.integrity && !finalProcess.after.pids && fault !== 'process-list';
      record('final force-stop and package process readback', action('finishStop', clean), {'s.finalStopped': clean});
      const restoration = result.home?.moved ? result.home.restoration.restored ? 'restored' : 'unproven' : 'unneeded';
      if (result.home?.moved) assert.ok(restore > finalStop);
      record('actual HOME restoration readback or no owned handoff', action('finishHome', restoration, homeOf(f.state)),
        {'s.home': homeOf(f.state), 's.restoration': restoration});
      if (start >= 0) {
        assert.ok(start > finalStop && start > restore);
        assert.equal(events[start].before.integrity, false);
      }
      const status = result.agentRestart?.state ?? 'unstarted';
      record('startup result from actual log and service probes', result.agentRestart ? action('startAgent', status) : action('skipStart'),
        {'s.agent': status, 's.passed': result.passed});
      record('host receives the update result', action('finishRecord'), {'s.passed': result.passed, 's.installVerified': result.installVerified});
      release();
      release = null;
      record('actual device lock release', action('releaseDevice'), {'s.locked': fs.existsSync(lock)});
      traces.push(trace);
    } finally {
      if (release) release();
      fs.rmSync(root, {recursive: true, force: true});
    }
  }

  const denied = {passed: false, verified: false, attempted: false, agent: 'unstarted'};
  const unverified = {...denied, attempted: true};
  const cleanupFailed = {...unverified, verified: true};
  scenario('verified update restores the original launcher and starts the agent');
  scenario('legacy export absence keeps package-only evidence', {alphaHome: false, fault: 'legacy-export', agentLog: '', agent: 'not-verified'});
  scenario('partial HOME handoff fails before either export or install', {...denied, fault: 'partial-handoff'});
  scenario('external HOME takeover during export blocks an ordinary update', {...denied, alphaHome: false, fault: 'home-takeover'});
  scenario('a restarted process during the first export blocks dispatch', {...denied, runningAt: 'pre-export'});
  scenario('missing process evidence stops before dispatch', {...denied, fault: 'process-list'});
  scenario('a restarted process during the second export blocks verification', {...unverified, runningAt: 'post-export'});
  scenario('changed post-install data blocks verification and restart', {...unverified, fault: 'changed-inventory'});
  scenario('the final integrity process must stop before launch', {...cleanupFailed, fault: 'stuck-integrity'});
  scenario('unproven HOME restore prevents launch even after install verification', {...cleanupFailed, fault: 'restore-home'});
  scenario('unknown installer response leaves the update unconfirmed and unstarted', {...unverified, fault: 'lost-install'});
  scenario('a verified install still fails when the local agent refuses startup', {
    passed: false, agent: 'refused', agentLog: 'E ElizaAgent: Private IPC recovery refused',
  });

  const receipt = await checkTraces({model, modelPath, sources: allSources, driverHashes, traces,
    batchSize: 3, scope: 'bounded-orchestration', assumptions: [
      'One admitted same-signer replacement, one Android user and one selected stock launcher.',
      'Actual planHome, updateUnit and shared APK comparison run against scripted adb. The actual device lock uses an owner-only temporary filesystem.',
      'Inventory contents, process names, HOME observations and startup logs are selected synthetic equality classes.',
      'The campaign composes the update core with the real device lock. The CLI admission and post-result unit record write are outside this source witness.',
    ]});
  return {receipts: [receipt], obligations: [
    {model, obligation: 'Installed update, process visibility and HOME recovery', reason: 'Scripted adb cannot establish real Android package manager behavior, process visibility, storage integrity export or agent health.'},
    {model, obligation: 'APK signing admission and full CLI orchestration', reason: 'Source replay starts after admission and drives a synthetic install port under the real device lock. Signer admission, interrupted host durability and actual unit record writes remain separate.'},
  ]};
}

test('scripted pilot update observations refine the bounded update and device lock model', async () => {
  const {receipts, obligations} = await runPilotApkUpdateRefinement();
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].model, 'PilotApkUpdate');
  assert.equal(receipts[0].traces, 12);
  assert.equal(receipts[0].driverInputsBound, true);
  assert.ok(obligations.some(row => row.obligation.includes('Installed update')));
});
