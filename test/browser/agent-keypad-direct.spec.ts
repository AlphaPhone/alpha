import {test, expect, type Page} from '@playwright/test';
import {installTelephonyFixture} from '../../scripts/fixtures/native-telephony';

// v612/v619: "open the phone dialer" with ask-before-actions off (direct-request-v1) opened the
// Keypad, but the chat showed "Stopped." and "May still finish" though nobody pressed Stop. The
// directly requested keypad runs inside the chat request that still carries its reply; bringing
// Phone in front changed the view context, and AlphaClient.setViewContext cancels the active
// request on any context change it was not told about. The keypad now comes in front once that
// request settles (AlphaClient.afterRequestSettles). The service bound the keypad proposal to the
// owner's message; the phone runs it with no card.
// Real renderer, pairing, connection controller, coordinator and installed telephony
// executor; the agent host, the action journal and AlphaTelephony are controlled bridge
// boundaries (scripts/fixtures/native-telephony.ts plus the host below). No model, SIM or radio is
// involved, and this is not a device acceptance test.

async function setup(page: Page, reply: string, from: 'home' | 'settings' = 'home', holdReceipt = false) {
  await page.addInitScript(installTelephonyFixture, {});
  await page.addInitScript(({reply, holdReceipt}) => {
    const w = window as any, fixture = w.keypadFixture = {
      proposal: null as any, decisions: [] as string[], receipts: [] as any[], journal: new Map<string, any>(), cancels: 0,
      release: null as null | (() => void),
    };
    // installTelephonyFixture chose the offline profile; this check pairs with a local agent instead.
    localStorage.removeItem('alpha.connection.selection.v1');
    const agentId = '12345678-1234-4234-8234-123456789abc', userMessageId = '87654321-4321-4321-8321-cba987654321', store = new Map<string, string>();
    for (const header of w.Capacitor.PluginHeaders) {
      const extra = header.name === 'AlphaConnection' ? ['request', 'cancel'] : header.name === 'AlphaActionJournal' ? ['reserve', 'markApplying', 'finish'] : [];
      for (const name of extra) if (!header.methods.some((method: any) => method.name === name)) header.methods.push({name, rtype: 'promise'});
    }
    const key = (input: any) => `${input.scope}:${input.proposalId}`;
    const hash = async (text: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(byte => byte.toString(16).padStart(2, '0')).join('');
    const original = w.Capacitor.nativePromise;
    w.Capacitor.nativePromise = async (plugin: string, method: string, input: any) => {
      if (plugin === 'AlphaActionJournal') {
        const entry = fixture.journal.get(key(input));
        if (method === 'reserve') { if (entry) return {created: false, entry: structuredClone(entry)}; const created = {...structuredClone(input), phase: 'reserved'}; fixture.journal.set(key(input), created); return {created: true, entry: structuredClone(created)}; }
        if (method === 'markApplying') { Object.assign(entry, {phase: 'applying', attemptId: input.attemptId}); return {}; }
        if (method === 'finish') { Object.assign(entry, structuredClone(input), {phase: 'terminal'}); return {}; }
        if (method === 'get') return {entry: entry ? structuredClone(entry) : null};
        if (method === 'list') return {entries: [...fixture.journal.values()].map(value => structuredClone(value))};
        throw Error('Unexpected journal call ' + method);
      }
      if (plugin !== 'AlphaConnection' || /^sms-draft:v1:/.test(input?.slot ?? '')) return original(plugin, method, input);
      if (method === 'secureRead') return {value: store.get(input.slot) ?? null};
      if (method === 'secureCompareExchange') { if ((store.get(input.slot) ?? null) !== input.expectedValue) return {status: 'conflict'}; if (input.value === null) store.delete(input.slot); else store.set(input.slot, input.value); return {status: 'saved'}; }
      if (method === 'secureWrite') { store.set(input.slot, input.value); return {}; }
      if (method === 'secureRemove') { store.delete(input.slot); return {}; }
      if (method === 'cancel') { fixture.cancels++; return {}; }
      if (method !== 'request') return original(plugin, method, input);
      const pathname = new URL(input.url).pathname, ok = (data: unknown) => ({status: 200, data});
      if (pathname === '/api/auth/status') return ok({required: true, authenticated: false, pairingEnabled: true, bootstrapRequired: false, instanceId: 'keypad-fixture', expiresAt: Date.now() + 60000});
      if (pathname === '/api/auth/pair') return ok({token: 'synthetic-session', identityId: 'fixture-owner', access: 'owner', instanceId: 'keypad-fixture'});
      if (input.headers.Authorization !== 'Bearer synthetic-session') throw Error('Unpaired request');
      if (pathname === '/api/auth/me') return ok({identity: {id: 'fixture-owner', displayName: 'Fixture owner', kind: 'owner'}, session: {id: 'synthetic-session', kind: 'machine', expiresAt: Date.now() + 600000}, access: {role: 'OWNER', mode: 'session'}});
      if (pathname === '/api/agents') return ok({agents: [{id: agentId, name: 'Keypad fixture', status: 'running'}]});
      if (pathname === '/api/client-devices/register') { w.keypadInstallation = input.headers['X-Eliza-Device-Id']; return ok({installationId: w.keypadInstallation, enrollmentId: 'fixture-enrollment', capabilities: ['phone.keypad.v1']}); }
      if (pathname === '/api/workflow/status') return ok({});
      if (pathname === '/api/conversations' && input.method === 'POST') return ok({conversation: {id: 'fixture-chat', title: 'Fixture'}});
      if (pathname === '/api/conversations/fixture-chat/messages' && input.method === 'POST') {
        if (!String(input.headers['X-Eliza-Device-Capabilities'] ?? '').split(',').includes('phone.keypad.v1')) throw Error('phone.keypad.v1 was not negotiated');
        const posted = JSON.parse(input.body);
        fixture.mode = posted.metadata?.agentActionMode;
        // As the service binds it in direct-request mode: the owner's own message requested this keypad.
        fixture.proposal = {id: 'fixture-proposal', digest: 'a'.repeat(64), state: 'pending', expiresAt: new Date(Date.now() + 60000).toISOString(), subjectUserId: 'fixture-owner', requestedBy: agentId, action: 'device_action',
          payload: {action: 'device_action', version: 1, installationId: w.keypadInstallation, enrollmentId: 'fixture-enrollment', operation: {type: 'phone_keypad'}, requestMessageId: userMessageId}};
        return ok({text: reply, agentName: 'Keypad fixture', userMessageId, actionResults: [{actionName: 'PROPOSE_DEVICE_ACTION', success: true, effectReceipts: [{receiptId: 'fixture-proposal', operation: 'device.phone_keypad', resource: {kind: 'device.approval', id: 'fixture-proposal'}, artifacts: [], idempotency: {key: 'device:fixture-proposal', replayed: false}, observedAt: new Date().toISOString(), outcome: 'preview'}]}]});
      }
      if (pathname === '/api/client-devices/proposals') return ok({proposals: fixture.proposal ? [fixture.proposal] : []});
      const sent = input.body ? JSON.parse(input.body) : {};
      if (pathname.startsWith('/api/client-devices/proposals/fixture-proposal/')) {
        if (sent.digest !== fixture.proposal.digest) throw Error('Review digest changed');
        if (pathname.endsWith('/decision')) { fixture.decisions.push(sent.decision); fixture.proposal = {...fixture.proposal, state: sent.decision === 'approve' ? 'approved' : 'rejected'}; return ok({proposal: fixture.proposal, digest: fixture.proposal.digest}); }
        if (pathname.endsWith('/claim')) { fixture.proposal = {...fixture.proposal, state: 'executing', execution: {attemptId: 'fixture-attempt', providerIdempotencyKey: 'fixture-proposal'}}; return ok({proposal: fixture.proposal, digest: fixture.proposal.digest}); }
        // Held when asked: the chat request stays in flight while the keypad's receipt is recorded, until the spec releases it.
        if (pathname.endsWith('/receipt') && holdReceipt && !fixture.receipts.length) await new Promise<void>(resolve => { fixture.release = resolve; });
        if (pathname.endsWith('/receipt')) { fixture.receipts.push(structuredClone(sent.receipt)); fixture.proposal = {...fixture.proposal, state: 'succeeded'}; return ok({proposal: fixture.proposal, digest: fixture.proposal.digest}); }
      }
      throw Error('Unexpected fixture route ' + pathname);
    };
  }, {reply, holdReceipt});
  await page.route('https://**/*', route => route.abort());
  await page.goto('/?mode=dev');
  await page.getByText('Local development agent', {exact: true}).click();
  const local = page.locator('.alpha-connection details').filter({has: page.getByText('Local development agent', {exact: true})});
  await local.getByLabel('Local agent address').fill('http://127.0.0.1:47842');
  await local.getByLabel('Pairing code', {exact: true}).fill('synthetic-code');
  await local.getByRole('button', {name: 'Connect local agent', exact: true}).click();
  await page.locator('.alpha-connection-scrim').waitFor({state: 'detached'});
  // v619 asked from Settings; any view other than Phone is the same: Phone comes in front.
  if (from === 'settings') { await page.getByRole('button', {name: 'Settings', exact: true}).click(); await expect(page.locator('html')).toHaveAttribute('data-active-view', 'settings'); }
  if (from === 'settings') await page.getByRole('group', {name: 'Assistant controls'}).getByRole('button', {name: 'Type', exact: true}).click();
  const input = page.getByRole('textbox', {name: /^(Ask Alpha|Message Alpha)$/});
  await input.fill('open the phone dialer');
  await input.press('Enter');
}
const REVIEW = 'Review this request on your phone before it can run.';
const replies = (page: Page) => page.locator('[data-alpha-message-text]');

// The fixed agent's reply, and the reply the agent gave before the fix: either way the keypad is
// the only outcome the owner reads, with no review line and no unsettled-reply notice.
for (const [reply, from] of [['Opening the keypad.', 'home'], [REVIEW, 'home'], ['Opening the keypad.', 'settings']] as const)
  test(`a requested empty keypad opens with no review and the reply settles: ${reply} (from ${from})`, async ({page}) => {
    await setup(page, reply, from);
    const f = () => page.evaluate(() => {const x = (window as any).keypadFixture; return {mode: x.mode, decisions: x.decisions, receipts: x.receipts.map((r: any) => r.outcome)};});
    await expect.poll(async () => (await f()).receipts).toEqual(['applied']);
    // The phone records its own approval of the bound request; the owner never saw a card.
    expect(await f()).toMatchObject({mode: 'direct-request-v1', decisions: ['approve']});
    await expect(page.locator('html')).toHaveAttribute('data-active-view', 'phone');
    await expect(page.locator('[data-alpha-phone-keypad]')).toBeVisible();
    await expect(replies(page).filter({hasText: /^The keypad is open\. Nothing was dialed\.$/})).toHaveCount(1);
    await expect(page.getByRole('button', {name: 'Stop reply', exact: true})).toHaveCount(0);
    await expect(page.getByRole('button', {name: /Approve$/})).toHaveCount(0);
    // The reply arrives whole beside the receipt: the keypad came in front only after it settled.
    if (reply !== REVIEW) await expect(replies(page).filter({hasText: /^Opening the keypad\.$/})).toHaveCount(1);
    // Nothing still says to review it, or that the reply may still finish.
    await page.waitForTimeout(500);
    await expect(page.getByText(REVIEW, {exact: true})).toHaveCount(0);
    await expect(page.getByText(/May still finish|Outcome unknown|Cancelled|stopped this reply/)).toHaveCount(0);
    expect(await page.evaluate(() => ((window as any).telephonyCalls as string[]).filter(m => m === 'dial' || m === 'placeCall'))).toEqual([]);
    expect(await page.evaluate(() => (window as any).keypadFixture.cancels)).toBe(0);
  });


// The owner's Stop still ends the reply while the requested keypad is in that same request.
test('the owner\'s Stop still ends the reply while a requested keypad is being recorded', async ({page}) => {
  await setup(page, 'Opening the keypad.', 'settings', true);
  await expect.poll(() => page.evaluate(() => !!(window as any).keypadFixture.release)).toBe(true);
  await page.getByRole('button', {name: 'Stop reply', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Stop reply', exact: true})).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as any).keypadFixture.cancels)).toBeGreaterThan(0);
  await page.evaluate(() => { const f = (window as any).keypadFixture, release = f.release; f.release = null; release(); });
  await page.waitForTimeout(500);
  await expect(replies(page).filter({hasText: /^Opening the keypad\.$/})).toHaveCount(0);
  expect(await page.evaluate(() => ((window as any).telephonyCalls as string[]).filter(m => m === 'dial' || m === 'placeCall'))).toEqual([]);
});
