import {openCloudPlanFromSettings,confirmCloudSignOut} from './helpers/cloud-plan-settings';
import { cloudStorageSlot } from '../../apps/app/src/runtime/cloud-deployment.generated';
import {seedCompletedAccessSetup} from './flag-off-android';
import { test, expect, type Page } from '@playwright/test';
import {installResidentAgentPlugin} from './helpers/resident-agent-plugin';
import { openYourAgent, completeAccessSetup, fenceNetwork } from './flag-off-android';

const SELECTION = 'alpha.connection.selection.v1', CLOUD_SERVICE = 'alpha.connection.cloud-service.v1';
const origin = 'https://agent.example.test';
const owner = '0f1b6c2e-8f43-4c8a-9a52-5b7e0e1a1f11', agent = '7d4e0c1a-2b3c-4d5e-8f60-718293a4b5c6';
const token = 'synthetic-machine-session';

type RevokeMode = 'revoked' | 'unsupported' | 'failed' | 'refused-in-body' | 'not-revoked-status' | 'no-content' | 'unauthorized' | 'server-error' | 'cancelled';
interface NativeCall { plugin: string; method: string; slot?: string; url?: string; http?: string; authorization?: string; path?: string }
interface AndroidOptions { selection?: unknown; remoteCredential?: boolean; cloudCredential?: boolean; balance?: number; revoke?: RevokeMode; packaged?: boolean; start?: 'reject' | 'starting' }
async function android(page: Page, options: AndroidOptions) {
  await installResidentAgentPlugin(page);
  await page.addInitScript(({ options, SELECTION, origin, owner, token }) => {
    const w = window as any; w.androidBridge = {}; w.nativeCalls = [];
    const id = '9f1dc45a-4011-4e44-947a-30d999d24fa5';
    const resident = w.residentAgent = w.createResidentAgentPlugin({ owner: () => id, agentId: id });
    const values: Record<string, string> = JSON.parse(sessionStorage.getItem('secure-fixture') || 'null') ?? {
      ...(options.remoteCredential ? { [`remote:${origin}`]: JSON.stringify({ origin, token, identityId: owner, sessionId: token, expiresAt: Date.now() + 3_600_000 }) } : {}),
      ...(options.cloudCredential ? { 'cloud:production': JSON.stringify({ token: 'synthetic-cloud-key', credentialId: id }) } : {}),
    };
    const persist = () => sessionStorage.setItem('secure-fixture', JSON.stringify(values));
    if (!sessionStorage.getItem('secure-fixture')) { persist(); if (options.selection) localStorage.setItem(SELECTION, JSON.stringify(options.selection)); }
    w.secureValues = () => ({ ...values });
    const methods = (names: string[]) => names.map(name => ({ name, rtype: 'promise' }));
    w.Capacitor = { PluginHeaders: [
        { name: 'AlphaDeletions', methods: methods(['pending']) },
      { name: 'ElizaSystem', methods: methods(['getBuildInfo']) },
      { name: 'ElizaSense', methods: methods(['status', 'turnOff']) },
      { name: 'DailyApps', methods: methods(['surfaceInfo', 'listReminders', 'pendingReminderTap']) },
      { name: 'Agent', methods: resident.methods(['getStatus', 'start', 'stop', 'configureCloudProvider', 'clearProvider', 'providerStatus', 'request']) },
      { name: 'AlphaConnection', methods: methods(['secureRead', 'secureWrite', 'secureRemove', 'secureCompareExchange', 'request', 'cancel', 'openExternal']) },
      { name: 'AlphaNotifications', methods: methods(['status', 'crossAppStatus', 'addListener', 'removeListener']) },
      { name: 'AlphaHostedResults', methods: methods(['disableBackground']) },
      { name: 'AlphaVoiceCloud', methods: methods(['checkPermissions']) },
      { name: 'AlphaHostedResults', methods: methods(['disableBackground']) },
    ], nativeCallback: resident.nativeCallback, nativePromise: async (plugin: string, method: string, input: any) => {
        if (plugin === 'AlphaDeletions' && method === 'pending') return { deletions: [] };
      w.nativeCalls.push({ plugin, method, slot: input?.slot, url: input?.url, http: input?.method, authorization: input?.headers?.Authorization, path: input?.path });
      if (plugin === 'AlphaHostedResults') return {};
      if (plugin === 'ElizaSystem' && method === 'getBuildInfo') return { launcher: false, version: 'connection-boundaries' };
      if (plugin === 'ElizaSense' && (method === 'status' || method === 'turnOff')) return { available: true, state: 'OFF', label: 'Listening off', consented: false, listening: false, microphoneOpen: false, ...(method === 'turnOff' ? { saved: true } : {}) };
      if (plugin === 'DailyApps') return method === 'listReminders' ? { reminders: [] } : method === 'surfaceInfo' ? { assistant: false, topInset: 0, bottomInset: 0 } : {};
      if (plugin === 'AlphaNotifications') return { permissionGranted: true, appEnabled: true };
      if (plugin === 'AlphaVoiceCloud') return { microphone: 'granted' };
      if (plugin === 'AlphaHostedResults' && method === 'disableBackground') return {};
      if (plugin === 'Agent') {
        const owned = resident.answer(method, input); if (owned) return owned;
        if (method === 'getStatus') return { packaged: options.packaged !== false, state: 'stopped', serviceActive: false, socketListening: false };
        if (method === 'clearProvider') { if (w.holdStop) await new Promise<void>(resolve => { w.releaseStop = resolve; }); return { configured: false }; }
        if (method === 'providerStatus') return { provider: 'elizacloud', configured: false };
        if (method === 'start' && options.start === 'reject') throw Object.assign(Error('Local agent failed to start.'), {code:'start-failed'});
        if (method === 'request') {
          const body = input.path === '/api/auth/me' ? { identity: { id, kind: 'owner' }, access: { role: 'OWNER', mode: 'local' } }
            : input.path === '/api/agents' ? { agents: [{ id, name: 'Alpha', status: options.start === 'starting' ? 'starting' : 'running' }] }
            : input.path === '/api/conversations' ? { conversations: [] } : {};
          return { status: 200, body: JSON.stringify(body) };
        }
        return {};
      }
      if (method === 'secureRead') return { value: values[input.slot] ?? null };
      if (method === 'secureWrite') { values[input.slot] = input.value; persist(); return {}; }
      if (method === 'secureRemove') { delete values[input.slot]; persist(); return {}; }
      if (method === 'secureCompareExchange') { if ((values[input.slot] ?? null) !== input.expectedValue) return { status: 'conflict' }; if (input.value === null) delete values[input.slot]; else values[input.slot] = input.value; persist(); return { status: 'saved' }; }
      if (method === 'request') {
        const url = new URL(input.url);
        if (url.origin !== 'https://api.eliza.app') throw Error('Connection request failed');
        if (url.pathname === '/api/v1/user') return { status: 200, data: { success: true, data: { id } } };
        if (url.pathname === '/api/v1/subscription/entitlement') return { status: 404, data: {} };
        if (url.pathname === '/api/v1/billing/limits') return { status: 200, data: { success: true, data: { v2: { subscription: (options.balance ?? 0) > 0 ? { status: 'available', value: { planKey: 'plus_monthly', state: 'active', currentPeriodEnd: '2099-01-01T00:00:00.000Z' } } : { status: 'not_applicable', reason: 'no_organization_subscription' } } } } };
        if (url.pathname === '/api/v1/api-keys/current' && input.method === 'DELETE') {
          if (options.revoke === 'failed') throw Error('Connection request failed');
          if (options.revoke === 'revoked') return { status: 200, data: { success: true, status: 'revoked', credentialId: id, revokedAt: new Date().toISOString() } };
          if (options.revoke === 'refused-in-body') return { status: 200, data: { success: false, error: 'synthetic refusal' } };
          if (options.revoke === 'not-revoked-status') return { status: 200, data: { success: true, status: 'active', credentialId: id } };
          if (options.revoke === 'no-content') return { status: 204, data: null };
          if (options.revoke === 'unauthorized') return { status: 401, data: { success: false } };
          if (options.revoke === 'server-error') return { status: 500, data: {} };
          return { status: 405, data: {} };
        }
        throw Error('Unexpected Cloud route: ' + url.pathname);
      }
      return {};
    } };
  }, { options, SELECTION, origin, owner, token });
}
const nativeCalls = (page: Page) => page.evaluate(() => (window as any).nativeCalls as NativeCall[]);
const secureValues = (page: Page) => page.evaluate(() => (window as any).secureValues() as Record<string, string>);
const remoteSlot = `remote:${origin}`;
function expectRemoteUntouched(calls: NativeCall[]) {
  expect(calls.filter(call => call.url?.startsWith(origin) || call.url?.includes('/api/auth/pair'))).toEqual([]);
  expect(calls.filter(call => call.slot?.startsWith('remote:'))).toEqual([]);
}

for (const legacy of [{ name: 'remote agent', selection: { kind: 'remote', origin } }, { name: 'local development agent', selection: { kind: 'local', origin } }, { name: 'Cloud agent', selection: { kind: 'cloud', environment: 'production', agentId: agent, ownerId: owner } }]) {
  test(`production Android never pairs or restores a saved ${legacy.name} and keeps its credential`, async ({ page }) => {
    const foreign = await fenceNetwork(page);
    await android(page, { selection: legacy.selection, remoteCredential: true });
    await page.goto('/');
    await expect.poll(async () => (await nativeCalls(page)).filter(call => call.plugin === 'Agent').map(call => call.method), {timeout:30_000}).toContain('start');
    const saved = await secureValues(page);
    const welcome = page.getByRole('main', { name: 'Alpha',exact:true });
    await expect(welcome).toBeVisible();
    await expect(welcome.getByLabel('Agent HTTPS address')).toHaveCount(0);
    await expect(welcome.getByLabel('Pairing code')).toHaveCount(0);
    await expect(welcome.getByRole('button', { name: /Connect (remote|local) agent/ })).toHaveCount(0);
    await expect(welcome.getByText(/Remote agent|Connected ·/)).toHaveCount(0);
    await expect.poll(async () => (await nativeCalls(page)).filter(call => call.plugin === 'Agent').map(call => call.method), {timeout:30_000}).toContain('start');
    await expect(welcome.getByRole('button', { name: 'Use local apps without AI', exact: true })).toHaveCount(0);
    await expect(welcome.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
    await expect(welcome.getByRole('button', { name: 'Use my own keys', exact: true })).toBeVisible();
    await expect(welcome.getByRole('button', { name: 'Close connection settings', exact: true })).toHaveCount(0);
    expectRemoteUntouched(await nativeCalls(page));
    expect((await secureValues(page))[remoteSlot]).toBe(saved[remoteSlot]);
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SELECTION)).toEqual({ kind: 'resident' });
    await page.reload();
    await expect(page.getByRole('main', { name: 'Alpha',exact:true })).toBeVisible();
    await expect.poll(async () => (await nativeCalls(page)).filter(call => call.plugin === 'Agent').map(call => call.method), {timeout:30_000}).toContain('start');
    const calls = await nativeCalls(page);
    expectRemoteUntouched(calls);
    expect(calls.filter(call => call.plugin === 'AlphaConnection' && call.method === 'request')).toEqual([]);
    expect(calls.filter(call => call.plugin === 'Agent').map(call => call.method)).toContain('start');
    expect(calls.filter(call => call.plugin === 'Agent').map(call => call.method)).not.toContain('configureCloudProvider');
    expect((await secureValues(page))[remoteSlot]).toBe(saved[remoteSlot]);
    expect(foreign).toEqual([]);
  });
}

test('production Android with a Cloud sign-in starts the resident agent instead of a saved remote agent', async ({ page }) => {
  const foreign = await fenceNetwork(page);
  await android(page, { selection: { kind: 'remote', origin }, remoteCredential: true, cloudCredential: true, balance: 5 });
  await page.goto('/');
  await completeAccessSetup(page);
  await expect(page.getByRole('button', { name: 'Notes', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const calls = await nativeCalls(page);
  expectRemoteUntouched(calls);
  const agentCalls = calls.filter(call => call.plugin === 'Agent').map(call => call.method);
  expect(agentCalls).toContain('configureCloudProvider');
  const routes = [...new Set(calls.filter(call => call.plugin === 'AlphaConnection' && call.method === 'request').map(call => new URL(call.url!).origin + new URL(call.url!).pathname))];
  expect(routes).toEqual(expect.arrayContaining(['https://api.eliza.app/api/v1/billing/limits', 'https://api.eliza.app/api/v1/user']));
  expect(routes).not.toContain('https://api.eliza.app/api/v1/credits/balance');
  expect(routes.filter(route => !route.startsWith('https://api.eliza.app/api/v1/') || /\/(agents|personal|conversations|messages)(\/|$)/.test(route))).toEqual([]);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SELECTION)).toEqual({ kind: 'resident' });
  expect((await secureValues(page))[remoteSlot]).toContain(token);
  expect(foreign).toEqual([]);
});

test('production Android without a packaged agent says so and does not advertise retired routes', async ({ page }) => {
  await fenceNetwork(page);
  await android(page, { cloudCredential: true, balance: 5, packaged: false });
  await page.goto('/');
  await completeAccessSetup(page);
  await expect(page.getByRole('button', { name: 'Notes', exact: true })).toBeVisible();
  const dialog = await openYourAgent(page);
  const alert = dialog.getByText('No on-device agent',{exact:true});
  await expect(alert).toHaveText('No on-device agent');
  await expect(alert).not.toContainText(/remote agent|pair/i);
  await expect(dialog.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Use local apps without AI', exact: true })).toHaveCount(0);
  expect((await nativeCalls(page)).filter(call => call.plugin === 'Agent').map(call => call.method)).not.toContain('start');
});

for (const start of ['reject','starting'] as const) {
  test(`production Android automatically reattaches when the resident reports ${start}`, async ({ page }) => {
    const foreign = await fenceNetwork(page);
    await page.clock.install();
    await android(page, { cloudCredential: true, balance: 5, start });
    await page.goto('/');
    await completeAccessSetup(page);
    await expect(page.getByRole('button', { name: 'Notes', exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-active-view', 'home');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Restart Alpha', exact: true })).toHaveCount(0);
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SELECTION)).toEqual({ kind: 'resident' });
    const starts = async () => (await nativeCalls(page)).filter(call => call.plugin === 'Agent' && call.method === 'start').length;
    await expect.poll(starts).toBeGreaterThanOrEqual(1);
    const previous=await starts();
    await page.clock.fastForward(60_050);
    await expect.poll(starts).toBeGreaterThan(previous);
    expect((await nativeCalls(page)).filter(call => call.path?.startsWith('/api/conversations'))).toEqual([]);
    expect(foreign).toEqual([]);
  });
}

for (const mode of ['revoked', 'unsupported', 'failed', 'refused-in-body', 'not-revoked-status', 'no-content', 'unauthorized', 'server-error', 'cancelled'] as const) {
  test(`production Android Cloud sign-out states only the revocation that happened: ${mode}`, async ({ page }) => {
    const foreign = await fenceNetwork(page);
    await android(page, { cloudCredential: true, balance: 5, revoke: mode });
    await page.goto('/');
    await completeAccessSetup(page);
    await expect(page.getByRole('button', { name: 'Notes', exact: true })).toBeVisible();
    await expect.poll(async () => (await nativeCalls(page)).filter(call => call.plugin === 'Agent').map(call => call.method), {timeout:30_000}).toContain('start');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await openCloudPlanFromSettings(page);
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
    const before = (await nativeCalls(page)).length;
    if (mode === 'cancelled') await page.evaluate(() => { (window as any).holdStop = true; });
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();await confirmCloudSignOut(page);
    if (mode === 'cancelled') {
      await page.waitForFunction(() => typeof (window as any).releaseStop === 'function');
      await page.keyboard.press('Escape');
      await page.evaluate(() => { (window as any).holdStop = false; (window as any).releaseStop(); });
    }
    await expect(page.getByRole('alert').filter({hasText:/^Unavailable$/})).toBeVisible();
    const status = page.locator('.alpha-connection').getByRole('status').filter({ hasText: /Signed out|sign-in token was removed/ });
    if (mode === 'revoked') await expect(status).toHaveText('Signed out · AI off');
    else {
      await expect(status).toContainText('Signed out here only');
      await expect(page.getByText(/was revoked/)).toHaveCount(0);
    }
    const calls = await nativeCalls(page);
    const revocations = calls.filter(call => call.http === 'DELETE');
    expect(revocations.map(call => [call.url, call.authorization])).toEqual(mode === 'cancelled' ? [] : [['https://api.eliza.app/api/v1/api-keys/current', 'Bearer synthetic-cloud-key']]);
    expect(calls.filter(call => call.authorization && !call.url?.startsWith('https://api.eliza.app/'))).toEqual([]);
    const stop = calls.findIndex((call, index) => index >= before && call.plugin === 'Agent' && call.method === 'clearProvider');
    expect(stop).toBeGreaterThan(-1);
    expect(calls.slice(before).some(call => call.plugin === 'AlphaHostedResults' && call.method === 'disableBackground')).toBe(true);
    if (mode !== 'cancelled') expect(stop).toBeLessThan(calls.indexOf(revocations[0]));
    expect(await secureValues(page)).not.toHaveProperty('cloud:production');
    await expect(page.getByRole('main', { name: 'Alpha', exact: true }).getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
    if (mode !== 'cancelled') await expect(status).toContainText('AI off');
    await expect.poll(async () => (await nativeCalls(page)).slice(before).filter(call => call.plugin === 'Agent' && call.method === 'start').length).toBeGreaterThan(0);
    await expect.poll(async()=>{const current=await nativeCalls(page),lastStart=current.findLastIndex(call=>call.plugin==='Agent'&&call.method==='start');return lastStart>=before&&current.slice(lastStart+1).some(call=>call.plugin==='Agent'&&call.method==='request'&&call.path==='/api/auth/me');}).toBe(true);
    await page.reload();
    await expect(page.getByRole('main', { name: 'Alpha', exact: true })).toBeVisible();
    expect((await nativeCalls(page)).filter(call => call.plugin === 'AlphaConnection' && call.method === 'request')).toEqual([]);
    expect(foreign).toEqual([]);
  });
}

const legacyWeb: Array<{ name: string; selection?: unknown; service?: string; alert?: RegExp; status?: RegExp }> = [
  { name: 'mock selection', selection: { kind: 'mock' }, status: /connects to real agents only/ },
  { name: 'Cloud staging service', selection: { kind: 'none' }, service: 'staging' },
  { name: 'Cloud staging agent', selection: { kind: 'cloud', environment: 'staging', agentId: agent, ownerId: owner }, service: 'staging' },
  { name: 'Cloud production agent', selection: { kind: 'cloud', environment: 'production', agentId: agent, ownerId: owner }, service: 'production', alert: /Eliza Cloud does not accept sign-in requests from this web page/ },
  { name: 'Cloud production service', selection: { kind: 'none' }, service: 'production' },
  { name: 'plain-HTTP local agent', selection: { kind: 'local', origin: 'http://127.0.0.1:9' } },
  { name: 'development profile', selection: { kind: 'development', profile: 'local' } },
  { name: 'on-device agent', selection: { kind: 'resident' }, alert: /The local agent is unavailable here\. Alpha runs its agent on the phone; this preview needs the local agent\./ },
];
for (const legacy of legacyWeb) {
  test(`the web build opens the chooser signed out for a saved ${legacy.name}`, async ({ page }) => {
    const foreign = await fenceNetwork(page);
    await page.addInitScript(({ legacy, SELECTION, CLOUD_SERVICE }) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      if (legacy.selection) localStorage.setItem(SELECTION, JSON.stringify(legacy.selection));
      if (legacy.service) localStorage.setItem(CLOUD_SERVICE, legacy.service);
    }, { legacy, SELECTION, CLOUD_SERVICE });
    await page.goto('/');
    const chooser = page.locator('.alpha-connection');
    await expect(chooser.getByText('Android only', { exact: true })).toBeVisible();
    await expect(chooser.getByRole('button', { name: 'Cancel', exact: true })).toHaveCount(0);
    await expect(chooser.getByText(/Connected ·/)).toHaveCount(0);
    await expect(chooser.getByRole('button', { name: 'Disconnect agent', exact: true })).toHaveCount(0);
    await expect(chooser.getByText(/Sign in again|Sign in with Eliza Cloud to continue|sign in with Eliza Cloud,/i)).toHaveCount(0);
    await expect(chooser.getByText('Development connections', { exact: true })).toHaveCount(0);
    await expect(page.locator('.mock-mode-banner')).toHaveCount(0);
    expect(new URL(page.url()).search).toBe('');
    expect(await page.evaluate(key => localStorage.getItem(key), CLOUD_SERVICE)).toBeNull();
    await chooser.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(chooser).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Notes', exact: true })).toBeVisible();
    expect(await page.evaluate(key => localStorage.getItem(key) ?? '', SELECTION)).toBe(JSON.stringify({ kind: 'offline' }));
    expect(foreign).toEqual([]);
  });
}

const SECRETS = 'alpha-connection-secrets.v1';
const slotRecords = (page: Page) => page.evaluate(async name => {
  if (!(await indexedDB.databases()).some(database => database.name === name)) return null;
  const db = await new Promise<IDBDatabase>((resolve, reject) => { const open = indexedDB.open(name); open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error); });
  try {
    if (!db.objectStoreNames.contains('slots')) return {};
    const store = db.transaction('slots', 'readonly').objectStore('slots');
    const all = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const [keys, values] = await Promise.all([all(store.getAllKeys()), all(store.getAll())]);
    return Object.fromEntries(keys.map((key, index) => [String(key), [...new Uint8Array(values[index].iv), ...new Uint8Array(values[index].data)].join(',')]));
  } finally { db.close(); }
}, SECRETS);
const CURRENT_CLOUD_SLOT = cloudStorageSlot('cloud:production');
const KEPT_SLOTS = [`remote:${origin}`, 'remote:https://second-agent.example.test', 'device:installation', 'cloud-runtime:synthetic', 'cloud:production', 'cloud:staging', cloudStorageSlot('cloud:staging'), 'cloud-deployment:other:cloud:production'];
const LOCAL_DATA = { 'synthetic.notes': '{"notes":[{"id":"n1","text":"Synthetic note"}]}', 'synthetic.assistant-draft': 'Synthetic unsent draft', 'synthetic.workflow-draft': '{"prompt":"Synthetic workflow draft"}' };
for (const saved of [
  { name: 'a saved Cloud agent', selection: { kind: 'cloud', environment: 'production', agentId: agent, ownerId: owner }, service: 'production' as string | null },
  { name: 'a saved Cloud service', selection: { kind: 'none' }, service: 'production' as string | null },
  { name: 'a Cloud key left by an earlier sign-out', selection: { kind: 'none' }, service: null as string | null },
  { name: 'a saved Cloud service behind an offline choice', selection: { kind: 'offline' }, service: 'production' as string | null, offline: true },
]) {
  test(`the web build's forced sign-out removes the stored Cloud key and nothing else: ${saved.name}`, async ({ page }) => {
    const foreign = await fenceNetwork(page);
    await page.goto('/build-flags.json');
    await page.evaluate(async ({ saved, SELECTION, CLOUD_SERVICE, SECRETS, CURRENT_CLOUD_SLOT, KEPT_SLOTS, LOCAL_DATA }) => {
      localStorage.setItem(SELECTION, JSON.stringify(saved.selection));
      if (saved.service) localStorage.setItem(CLOUD_SERVICE, saved.service);
      for (const [key, value] of Object.entries(LOCAL_DATA)) localStorage.setItem(key, value);
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open(SECRETS, 1);
        open.onupgradeneeded = () => { open.result.createObjectStore('keys'); open.result.createObjectStore('slots'); };
        open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error);
      });
      const tx = db.transaction('slots', 'readwrite');
      [CURRENT_CLOUD_SLOT, ...KEPT_SLOTS].forEach((slot, index) => tx.objectStore('slots').put({ iv: new Uint8Array(12).fill(index + 1), data: new Uint8Array(24).fill(index + 101).buffer }, slot));
      await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
      db.close();
    }, { saved, SELECTION, CLOUD_SERVICE, SECRETS, CURRENT_CLOUD_SLOT, KEPT_SLOTS, LOCAL_DATA });
    const before = (await slotRecords(page))!;
    expect(Object.keys(before).sort()).toEqual([CURRENT_CLOUD_SLOT, ...KEPT_SLOTS].sort());
    await page.goto('/');
    const chooser = page.locator('.alpha-connection');
    const offline = 'offline' in saved;
    if (!offline) await expect(chooser.getByText('Android only', { exact: true })).toBeVisible();
    await expect.poll(async () => Object.keys((await slotRecords(page))!).sort()).toEqual([...KEPT_SLOTS].sort());
    const { [CURRENT_CLOUD_SLOT]: removed, ...kept } = before;
    expect(removed).toBeTruthy();
    expect(await slotRecords(page)).toEqual(kept);
    expect(await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.keys(LOCAL_DATA))).toEqual(LOCAL_DATA);
    expect(await page.evaluate(key => localStorage.getItem(key), CLOUD_SERVICE)).toBeNull();
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SELECTION)).toEqual(saved.selection);
    await expect(chooser.getByText(/Connected ·/)).toHaveCount(0);
    await page.reload();
    if (offline) await expect(chooser).toHaveCount(0);
    else await expect(chooser.getByText('Android only', { exact: true })).toBeVisible();
    expect(await slotRecords(page)).toEqual(kept);
    expect(foreign).toEqual([]);
  });
}

test('the web build\'s forced sign-out does not create a secret store in a browser that never had one', async ({ page }) => {
  const foreign = await fenceNetwork(page);
  await page.addInitScript(({ SELECTION, CLOUD_SERVICE }) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem(SELECTION, JSON.stringify({ kind: 'none' })); localStorage.setItem(CLOUD_SERVICE, 'production');
  }, { SELECTION, CLOUD_SERVICE });
  await page.goto('/');
  await expect(page.locator('.alpha-connection').getByText('Android only', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), CLOUD_SERVICE)).toBeNull();
  await page.waitForTimeout(500);
  expect(await slotRecords(page)).toBeNull();
  expect(foreign).toEqual([]);
});

test('automatic startup holds the shell until the agent is ready',async({page})=>{
  await android(page,{cloudCredential:true,balance:5});
  await page.addInitScript(()=>{
    const w=window as any,bridge=w.Capacitor,original=bridge.nativePromise;
    bridge.nativePromise=(plugin:string,method:string,input:any)=>{
      if(plugin==='Agent'&&method==='start')return new Promise(resolve=>{w.agentStartHeld=true;w.releaseAgentStart=()=>resolve(original(plugin,method,input));});
      return original(plugin,method,input);
    };
  });
  await page.goto('/');
  await expect(page.locator('.alpha-startup-permissions')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>(window as any).agentStartHeld)).toBe(true);
  await expect(page.getByRole('status',{name:'Loading Alpha',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Notes',exact:true})).toHaveCount(0);
  await expect(page.getByText('Your agent is starting…',{exact:true})).toHaveCount(0);
  await page.evaluate(()=>(window as any).releaseAgentStart());
  await completeAccessSetup(page);
});

async function observeIdleDeletionReads(page: Page, count: () => Promise<number>) {
  for (let reads = 1; reads <= 3; reads++) {
    if (reads > 1) await page.clock.fastForward(5_000);
    await expect.poll(count).toBeGreaterThanOrEqual(reads);
  }
}

test('transient startup storage failures recover without flashing global notices',async({page})=>{
  await page.clock.install();
  await android(page,{cloudCredential:true,balance:5});
  await page.addInitScript(()=>{
    const w=window as any,bridge=w.Capacitor,original=bridge.nativePromise;
    w.startupStorage={pending:0,drafts:0,flashes:[]};
    bridge.nativePromise=(plugin:string,method:string,input:any)=>{
      if(plugin==='AlphaDeletions'&&method==='pending'&&++w.startupStorage.pending<=2)return Promise.reject(Error('Storage is opening'));
      if(plugin==='AlphaConnection'&&method==='secureRead'&&input?.slot?.startsWith('assistant-draft:')&&++w.startupStorage.drafts===1)return Promise.reject(Error('Storage is opening'));
      return original(plugin,method,input);
    };
    new MutationObserver(()=>{
      const text=document.body?.textContent||'';
      if(/Pending deletion status is unavailable|Opening local draft|Local draft could not/.test(text))w.startupStorage.flashes.push(text);
    }).observe(document,{subtree:true,childList:true,characterData:true});
  });
  await page.goto('/');
  await completeAccessSetup(page);
  await expect(page.getByRole('button',{name:'Notes',exact:true})).toBeVisible();
  await observeIdleDeletionReads(page,()=>page.evaluate(()=>(window as any).startupStorage.pending));
  await expect.poll(()=>page.evaluate(()=>(window as any).startupStorage.drafts)).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(()=>(window as any).startupStorage.flashes)).toEqual([]);
});

test('passive deletion failures stay quiet; known pending failures preserve settings access', async ({ page }) => {
  await page.clock.install();
  await android(page, { cloudCredential: true, balance: 5, revoke: 'revoked' });
  await page.goto('/');
  await completeAccessSetup(page);
  await expect(page.getByRole('button', { name: 'Notes', exact: true })).toBeVisible();
  await expect(page.locator('.alpha-connection-scrim')).toHaveCount(0);
  await page.evaluate(() => {
    const state=(window as any).deletionNoticeFixture={known:false,checks:0};
    const bridge = (window as any).Capacitor, original = bridge.nativePromise;
    bridge.nativePromise = (plugin: string, method: string, input: unknown) => {
      if (plugin === 'AlphaDeletions' && method === 'pending') {
        state.checks++;
        return state.known?Promise.resolve({deletions:[{id:'known-pending',kind:'calendar',phase:'queued',window:'open',target:{row:{title:'Known pending event'}}}]}):Promise.reject(Error('Receipt store unavailable'));
      }
      return original(plugin, method, input);
    };
    window.dispatchEvent(new Event('alpha:deletions-changed'));
  });
  const notice = page.getByRole('complementary', { name: 'Pending deletions' });
  await observeIdleDeletionReads(page,()=>page.evaluate(()=>(window as any).deletionNoticeFixture.checks));
  await expect(notice).toHaveCount(0);
  await page.evaluate(()=>{(window as any).deletionNoticeFixture.known=true;window.dispatchEvent(new Event('alpha:deletions-changed'));});
  await expect(notice).toContainText('Known pending event');
  await page.evaluate(()=>{Object.assign((window as any).deletionNoticeFixture,{known:false,checks:0});window.dispatchEvent(new Event('alpha:deletions-changed'));});
  await expect(notice).toContainText('Pending deletion status is unavailable');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openCloudPlanFromSettings(page);
  const signout = page.getByRole('button', { name: 'Sign out', exact: true });
  await signout.evaluate(button => {
    const banner = document.querySelector<HTMLElement>('.alpha-deletion-undo')!, rect = button.getBoundingClientRect();
    Object.assign(banner.style, { top: `${rect.top}px`, left: `${rect.left}px`, right: 'auto', bottom: 'auto', width: `${rect.width}px` });
  });
  await signout.click();await confirmCloudSignOut(page);
  await expect(page.locator('.alpha-connection').getByRole('status')).toContainText('Signed out');
  await expect(notice).toHaveCount(0);
});

test.beforeEach(async({page})=>seedCompletedAccessSetup(page));
