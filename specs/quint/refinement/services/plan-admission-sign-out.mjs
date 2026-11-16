import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import {filesWithin, relativePath, sourcePaths} from '../../../../scripts/quint-lib.ts';
import {fenceNetwork, flagOffAndroid} from '../../../../test/browser/flag-off-android.ts';
import {residentStub} from '../../../../test/browser/resident-stub.ts';
import {captureInputs, checkTraces} from '../check-traces.mjs';
import {scaledTimeout} from '../timeouts.mjs';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const recordKey = 'alpha.connection.plan-admission.v1';
const account = {
  token: 'synthetic-plan-signout',
  userId: '9f1dc45a-4011-4e44-947a-30d999d24fa5',
  email: 'plan-signout@example.invalid',
  balance: 5,
  plan: 'credits',
};
const credentialId = 'f9c99a48-f889-4e7c-9dee-ef4f2a822ab3';
const entry = '/quint-plan-signout-entry.js';

export async function checkPlanAdmissionSignOut(extraSources = []) {
  const sources = [...sourcePaths(), 'vite.config.ts', 'package.json', 'bun.lock', 'upstream.lock.json',
    'scripts/quint-lib.ts', 'scripts/prepare-client-features.ts', 'test/browser/flag-off-android.ts',
    'test/browser/resident-stub.ts', 'test/browser/helpers/native-navigation-protocol.ts',
    ...filesWithin(resolve(root, '.eliza/client-features'), path => /\.(?:ts|tsx|js|json|css|html)$/.test(path)).map(relativePath),
    fileURLToPath(import.meta.url), ...extraSources];
  const driverHashes = captureInputs(sources);
  const prior = process.env.ELIZA_DEV_ALLOW_TEST_MOCKS;
  let server, browser;
  try {
    process.env.ELIZA_DEV_ALLOW_TEST_MOCKS = '';
    server = await createServer({
      configLoader: 'runner', configFile: resolve(root, 'vite.config.ts'), logLevel: 'error',
      cacheDir: resolve(root, 'test-results/quint-refinement/plan-sign-out-cache'),
      server: {host: '127.0.0.1', port: 0}, define: {'import.meta.env.VITE_ELIZA_DEV_ALLOW_TEST_MOCKS': '""'},
      plugins: [{
        name: 'quint-plan-sign-out',
        resolveId(id) { if (id === entry) return '\0' + entry; },
        load(id) {
          if (id === '\0' + entry) return "import {connectionController} from '/src/runtime/connection-ui.tsx'; window.planController = connectionController;";
        },
        configureServer(instance) {
          instance.middlewares.use('/quint-plan-signout', async (_request, response) => {
            response.setHeader('Content-Type', 'text/html');
            response.end(await instance.transformIndexHtml('/quint-plan-signout', `<script type="module" src="${entry}"></script>`));
          });
        },
      }],
    });
  } finally {
    if (prior === undefined) delete process.env.ELIZA_DEV_ALLOW_TEST_MOCKS;
    else process.env.ELIZA_DEV_ALLOW_TEST_MOCKS = prior;
  }

  const trace = {name: 'signOutRemovesRecordTest through the real flag-off controller', steps: []};
  try {
    await server.listen();
    browser = await chromium.launch({headless: true});
    const page = await browser.newPage();
    page.setDefaultTimeout(scaledTimeout(30000));
    const foreign = await fenceNetwork(page);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const initializers = [];
    // Run the existing Android bridge before its resident extension in one ordered script.
    const fixturePage = {addInitScript(script, argument) {
      assert.equal(typeof script, 'function');
      initializers.push(`(${script.toString()})(${JSON.stringify(argument) ?? 'undefined'});`);
    }};
    await flagOffAndroid(fixturePage);
    await residentStub(fixturePage, {emptyKeystore: true, accounts: [account]});
    await fixturePage.addInitScript(({recordKey, account, credentialId}) => {
      const f = window.flagOff;
      const slot = 'cloud:production';
      const provider = 'native:local-agent-provider';
      const credential = JSON.stringify({credentialId, token: account.token, expiresAt: Date.now() + 86_400_000});
      const fixture = window.signOutFixture = {offline: false, offlineReads: 0, recordWrites: 0, revocations: []};
      fixture.loadCredential = () => { f.slots[slot] = credential; f.persist(); };
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        setItem.call(this, key, value);
        if (this === localStorage && key === recordKey) fixture.recordWrites++;
      };
      const nativePromise = window.Capacitor.nativePromise;
      window.Capacitor.nativePromise = async (plugin, method, input) => {
        if (plugin === 'AlphaConnection' && method === 'request') {
          const url = new URL(input.url);
          if (url.origin === 'https://api.eliza.app') {
            const exactBearer = input.headers?.Authorization === 'Bearer ' + account.token;
            if (input.method === 'DELETE' && url.pathname === '/api/v1/api-keys/current') {
              fixture.revocations.push({
                exactBearer, exactCredential: f.slots[slot] === credential,
                recordRemoved: localStorage.getItem(recordKey) === null, unbound: !f.slots[provider],
              });
            }
            if (fixture.offline && input.method === 'GET' && url.pathname === '/api/v1/user' && exactBearer) {
              fixture.offlineReads++;
              throw Error('Connection request failed');
            }
          }
        }
        return nativePromise(plugin, method, input);
      };
      const credentialNumber = id => id == null ? 0 : id === credentialId ? 1 : -1;
      fixture.observe = () => {
        const snapshot = window.planController.getSnapshot();
        const saved = JSON.parse(f.slots[slot] ?? 'null');
        const record = JSON.parse(localStorage.getItem(recordKey) ?? 'null');
        const binding = snapshot.residentInference;
        const now = Date.now();
        return {
          's.credential': credentialNumber(saved?.credentialId),
          's.record': {
            present: !!record, credential: credentialNumber(record?.credentialId),
            age: record && now - record.verifiedAt > 7 * 86_400_000 ? 'old' : 'fresh',
            endsAt: record?.endsAt == null ? 'none' : record.endsAt > now ? 'future' : 'past',
          },
          's.binding': f.slots[provider] === credentialId && binding === 'cloud' ? 'cloud'
            : !f.slots[provider] && binding === 'unavailable' ? 'unbound'
            : !f.slots[provider] && binding == null ? 'none' : 'unconfirmed',
          's.notice': snapshot.residentPlanNotice ?? 'none',
          's.writes': fixture.recordWrites,
        };
      };
    }, {recordKey, account, credentialId});
    await page.addInitScript(`(() => {
      const __name = (value, name) => Object.defineProperty(value, 'name', {value: name, configurable: true});
      ${initializers.join('\n')}
    })();`);
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/quint-plan-signout`,
      {waitUntil: 'domcontentloaded', timeout: scaledTimeout(90000)});
    try {
      await page.waitForFunction(() => !!window.planController);
    } catch (error) {
      throw new Error(`Controller startup failed ${JSON.stringify({errors, foreign})}`, {cause: error});
    }
    const observe = () => page.evaluate(() => window.signOutFixture.observe());
    trace.expect = await observe();

    await page.evaluate(async () => {
      window.signOutFixture.loadCredential();
      await window.planController.initialize();
    });
    await page.waitForFunction(() => {
      const snapshot = window.planController.getSnapshot();
      return snapshot.kind === 'resident' && !snapshot.busy && snapshot.residentInference === 'cloud';
    });
    const verified = await page.evaluate((key) => {
      const record = JSON.parse(localStorage.getItem(key));
      return {status: record?.status, userId: record?.userId, environment: record?.environment};
    }, recordKey);
    assert.deepEqual(verified, {status: 'credit-funded', userId: account.userId, environment: 'production'});
    trace.steps.push({label: 'verify and bind the saved credit-funded identity',
      action: [{name: 'signIn', args: [1]}, {name: 'verified', args: ['credits', 'none']}], expect: await observe()});

    await page.evaluate(() => window.planController.cloudSignOut());
    const signedOut = await page.evaluate(() => {
      const snapshot = window.planController.getSnapshot();
      return {
        resident: snapshot.kind === 'resident', detached: !snapshot.cloudAccount,
        notice: snapshot.signOutNotice, revocations: window.signOutFixture.revocations,
      };
    });
    assert.equal(signedOut.resident, true);
    assert.equal(signedOut.detached, true);
    assert.match(signedOut.notice, /^Signed out ·/);
    assert.deepEqual(signedOut.revocations, [{exactBearer: true, exactCredential: true, recordRemoved: true, unbound: true}]);
    trace.steps.push({label: 'real sign-out removes grace and the exact credential',
      action: {name: 'signOut'}, expect: await observe()});

    await page.evaluate(async () => {
      window.signOutFixture.offline = true;
      window.signOutFixture.loadCredential();
      await window.planController.startLocal();
    });
    const offline = await page.evaluate(() => {
      const snapshot = window.planController.getSnapshot();
      return {
        reads: window.signOutFixture.offlineReads, resident: snapshot.kind === 'resident',
        detached: !snapshot.cloudAccount, saved: snapshot.residentSavedCredential,
        configurations: window.residentStub.order.filter(event => event.startsWith('configureCloudProvider ')).length,
      };
    });
    assert.deepEqual(offline, {reads: 1, resident: true, detached: true, saved: true, configurations: 1});
    trace.steps.push({label: 'the same saved credential cannot recover grace offline',
      action: [{name: 'signIn', args: [1]}, {name: 'admitOffline'}], expect: await observe()});
    trace.transportObservations = {revocations: signedOut.revocations, offline};
    assert.deepEqual(foreign, []);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server?.close();
  }

  return checkTraces({
    model: 'PlanAdmissionGrace', id: 'PlanAdmissionGraceSignOut', traces: [trace], sources, driverHashes,
    scope: 'bounded-orchestration', assumptions: [
      'The whole flag-off connection controller and its transitive runtime imports execute in Chromium with closed native and Cloud ports.',
      'Admitting the same synthetic saved credential through initialize and startLocal corresponds to signIn in this trace. Verified, sign-out and offline checkpoints observe the stored record and credential, configuration slot, controller inference and notice, and actual record writes.',
      'The exact synthetic self-revocation sees the old key still present, after the grace record and native provider binding are removed. The fixture does not verify native storage, actual Cloud revocation, or other sign-out schedules.',
    ],
  });
}
