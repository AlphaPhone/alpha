import {test, expect, type Page} from '@playwright/test';
import {installTelephonyFixture} from '../../scripts/fixtures/native-telephony';
import {preloadPageModules} from './helpers/page-modules';

// The owner's Send on Alpha's "Review SMS" card is the confirmation: tapping it sends the text,
// and no dialog follows. Real renderer, pairing, connection controller, proposal parser, coordinator
// and installed executor. The agent host, the encrypted action journal and AlphaTelephony are
// controlled bridge boundaries (scripts/fixtures/native-telephony.ts plus the host below): no model,
// SIM, radio or Android dialog is involved. The bridge's sendSms admits a text only for the applying
// journal entry its journalIdentity names, with that entry's exact number and text, once, as
// AlphaApprovedSms does on the phone (AlphaTelephonySendTest covers the Java side).

const NUMBER = '+15550100199', BODY = 'On my way';

async function setup(page: Page, contactMode?: 'one' | 'two' | 'none') {
  await page.addInitScript(installTelephonyFixture, {});
  await page.addInitScript(({number, body, contactMode}) => {
    const w = window as any, fixture = w.smsCardFixture = {
      proposal: null as any, decisions: [] as string[], receipts: [] as any[], sends: [] as any[], refused: [] as string[],
      journal: new Map<string, any>(),
    };
    if (contactMode) {
      const contacts = contactMode === 'none' ? [] : [{id: '41', name: 'Carson', phones: [number], emails: []}];
      if (contactMode === 'two') contacts.push({id: '42', name: 'Carson', phones: ['+15550100198'], emails: []});
      w.people.splice(0, w.people.length, ...contacts);
    }
    // installTelephonyFixture chose the offline profile; this check pairs with a local agent instead.
    localStorage.removeItem('alpha.connection.selection.v1');
    const agentId = '12345678-1234-4234-8234-123456789abc', store = new Map<string, string>();
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
      if (plugin === 'AlphaTelephony' && method === 'sendSms') {
        w.telephonyCalls.push(method); w.telephonyInputs.push([method, input]);
        // AlphaApprovedSms: only the applying entry this request names, with its exact number and text, once.
        const entry = input.journalIdentity && fixture.journal.get(key(input.journalIdentity));
        const operation = entry?.record?.operation;
        if (!entry || entry.phase !== 'applying' || entry.operationId !== input.operationId || entry.smsDispatchClaim
          || operation?.type !== 'sms_compose' || operation.body !== input.body || operation.target?.number !== input.recipients?.[0] || input.recipients.length !== 1) {
          fixture.refused.push(input.operationId);
          throw Object.assign(Error('This text is not the one approved on its card. Nothing was sent.'), {code: 'not-approved'});
        }
        entry.smsDispatchClaim = {operationId: input.operationId};
        fixture.sends.push(structuredClone(input));
        const bindingHash = await hash(JSON.stringify({body: input.body, recipients: input.recipients, subscriptionId: input.subscriptionId, type: 'sms_send'}));
        return {kind: 'sms-send', operationId: input.operationId, subscriptionId: input.subscriptionId, bindingHash, status: 'sent', parts: [{index: 0, recipientIndex: 0, partIndex: 0, sent: 'success', delivery: 'unknown'}], createdAt: Date.now()};
      }
      if (plugin !== 'AlphaConnection' || /^sms-draft:v1:/.test(input?.slot ?? '')) return original(plugin, method, input);
      if (method === 'secureRead') return {value: store.get(input.slot) ?? null};
      if (method === 'secureCompareExchange') { if ((store.get(input.slot) ?? null) !== input.expectedValue) return {status: 'conflict'}; if (input.value === null) store.delete(input.slot); else store.set(input.slot, input.value); return {status: 'saved'}; }
      if (method === 'secureWrite') { store.set(input.slot, input.value); return {}; }
      if (method === 'secureRemove') { store.delete(input.slot); return {}; }
      if (method === 'cancel') return {};
      if (method !== 'request') return original(plugin, method, input);
      const pathname = new URL(input.url).pathname, ok = (data: unknown) => ({status: 200, data});
      if (pathname === '/api/auth/status') return ok({required: true, authenticated: false, pairingEnabled: true, bootstrapRequired: false, instanceId: 'sms-card-fixture', expiresAt: Date.now() + 60000});
      if (pathname === '/api/auth/pair') return ok({token: 'synthetic-session', identityId: 'fixture-owner', access: 'owner', instanceId: 'sms-card-fixture'});
      if (input.headers.Authorization !== 'Bearer synthetic-session') throw Error('Unpaired request');
      if (pathname === '/api/auth/me') return ok({identity: {id: 'fixture-owner', displayName: 'Fixture owner', kind: 'owner'}, session: {id: 'synthetic-session', kind: 'machine', expiresAt: Date.now() + 600000}, access: {role: 'OWNER', mode: 'session'}});
      if (pathname === '/api/agents') return ok({agents: [{id: agentId, name: 'SMS card fixture', status: 'running'}]});
      if (pathname === '/api/client-devices/register') { w.smsCardInstallation = input.headers['X-Eliza-Device-Id']; return ok({installationId: w.smsCardInstallation, enrollmentId: 'fixture-enrollment', capabilities: ['sms.compose.v1', 'sms.compose.v2']}); }
      if (pathname === '/api/workflow/status') return ok({});
      if (pathname === '/api/conversations' && input.method === 'POST') return ok({conversation: {id: 'fixture-chat', title: 'Fixture'}});
      if (pathname === '/api/conversations/fixture-chat/messages' && input.method === 'POST') {
        if (!String(input.headers['X-Eliza-Device-Capabilities'] ?? '').split(',').includes('sms.compose.v2')) throw Error('sms.compose.v2 was not negotiated');
        fixture.proposal = {id: 'fixture-proposal', digest: 'a'.repeat(64), state: 'pending', expiresAt: new Date(Date.now() + 60000).toISOString(), subjectUserId: 'fixture-owner', requestedBy: agentId, action: 'device_action',
          payload: {action: 'device_action', version: 1, installationId: w.smsCardInstallation, enrollmentId: 'fixture-enrollment', operation: {type: 'sms_compose', target: contactMode ? {kind:'contact', query:contactMode==='none'?'Qassem':'Carson'} : {kind: 'number', number}, body, ...(contactMode ? {draft:true} : {})}}};
        return ok({text: 'Review the text below.', agentName: 'SMS card fixture', ...(contactMode ? {
          messageId:'11111111-1111-4111-8111-111111111111',userMessageId:'22222222-2222-4222-8222-222222222222',
        } : {})});
      }
      if (pathname === '/api/client-devices/proposals') return ok({proposals: fixture.proposal ? [fixture.proposal] : []});
      const sent = input.body ? JSON.parse(input.body) : {};
      if (pathname.startsWith('/api/client-devices/proposals/fixture-proposal/')) {
        if (sent.digest !== fixture.proposal.digest) throw Error('Review digest changed');
        if (pathname.endsWith('/decision')) { fixture.decisions.push(sent.decision); fixture.proposal = {...fixture.proposal, state: sent.decision === 'approve' ? 'approved' : 'rejected'}; return ok({proposal: fixture.proposal, digest: fixture.proposal.digest}); }
        if (pathname.endsWith('/claim')) { fixture.proposal = {...fixture.proposal, state: 'executing', execution: {attemptId: 'fixture-attempt', providerIdempotencyKey: 'fixture-proposal'}}; return ok({proposal: fixture.proposal, digest: fixture.proposal.digest}); }
        if (pathname.endsWith('/receipt')) { fixture.receipts.push(structuredClone(sent.receipt)); fixture.proposal = {...fixture.proposal, state: 'succeeded'}; return ok({proposal: fixture.proposal, digest: fixture.proposal.digest}); }
      }
      throw Error('Unexpected fixture route ' + pathname);
    };
  }, {number: NUMBER, body: BODY, contactMode});
  await page.route('https://**/*', route => route.abort());
  await page.goto('/?mode=dev');
  await page.getByText('Local development agent', {exact: true}).click();
  const local = page.locator('.alpha-connection details').filter({has: page.getByText('Local development agent', {exact: true})});
  await local.getByLabel('Local agent address').fill('http://127.0.0.1:47842');
  await local.getByLabel('Pairing code', {exact: true}).fill('synthetic-code');
  await local.getByRole('button', {name: 'Connect local agent', exact: true}).click();
  await page.locator('.alpha-connection-scrim').waitFor({state: 'detached'});
  if (contactMode) {
    await preloadPageModules(page, ['/src/prototype/model.js']);
    await page.evaluate(() => {
      const w = window as any;
      const {Component} = w.__alphaModules['/src/prototype/model.js'];
      const render = Component.prototype.renderVals;
      Component.prototype.renderVals = function () { w.smsCardFixture.shell = this; return render.call(this); };
    });
    await page.getByRole('button', {name: 'Open conversation', exact: true}).click();
    await page.evaluate(async () => {
      const f = (window as any).smsCardFixture;
      f.shell.voiceConversationActive = () => true;
      const signal = new AbortController().signal;
      f.voice = async (text: string) => {
        const prepared = await f.shell.prepareVoiceConversation(signal);
        return f.shell.sendVoiceTurn({...prepared, text, signal, approvalSignal: signal, talkGeneration: 1,
          turnId: crypto.randomUUID(), assertCurrent: () => signal.throwIfAborted(),
          voiceTurnSignal: {nextSpeaker: 'agent', agentShouldSpeak: true, source: 'fixture'}});
      };
    });
    return page.getByRole('button', {name: /^Draft SMS/});
  }
  const input = page.getByRole('textbox', {name: 'Ask Alpha', exact: true});
  await input.fill(`Text ${NUMBER}: ${BODY}`);
  await input.press('Enter');
  const card = page.getByRole('button', {name: /^Review SMS/});
  await expect(card).toBeVisible();
  return card;
}
const state = (page: Page) => page.evaluate(() => {
  const f = (window as any).smsCardFixture;
  return {decisions: f.decisions, sends: f.sends.length, refused: f.refused.length, receipts: f.receipts.map((receipt: any) => receipt.outcome), sendSms: ((window as any).telephonyCalls as string[]).filter(method => method === 'sendSms').length};
});

test('Send on the Review SMS card sends the text once, under that card, with no dialog after it', async ({page}) => {
  const card = await setup(page);
  // Everything the send depends on is on the card itself; it never says to confirm again.
  await expect(card).toContainText(`To: ${NUMBER}`);
  await expect(card).toContainText('From: the SIM chosen in Messages, or your default texting SIM');
  await expect(card).toContainText(BODY);
  await expect(card).toContainText('Send submits it right away. Your carrier may charge for texts.');
  await expect(card).not.toContainText(/Android|again/);
  expect((await state(page)).sendSms).toBe(0);
  // The card's own Send control is what the owner taps; nothing opens after it.
  await expect(card).toContainText('Send');
  await card.click();
  await expect.poll(async () => (await state(page)).receipts).toEqual(['applied']);
  expect(await state(page)).toMatchObject({decisions: ['approve'], sends: 1, refused: 0, sendSms: 1});
  const sent = await page.evaluate(() => (window as any).smsCardFixture.sends[0]);
  expect(sent).toMatchObject({recipients: [NUMBER], body: BODY, subscriptionId: 1, operationId: 'fixture-proposal'});
  expect(sent.journalIdentity).toEqual({scope: expect.stringMatching(/^[a-f0-9]{64}$/), proposalId: 'fixture-proposal'});
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-alpha-proposal-review]')).toHaveCount(0);
  // The same approval never admits a second send: Android refuses a replay of its journal entry.
  const replay = await page.evaluate(async ({identity}) => {
    try { await (window as any).Capacitor.nativePromise('AlphaTelephony', 'sendSms', {recipients: ['+15550100199'], body: 'On my way', subscriptionId: 1, operationId: 'fixture-proposal', journalIdentity: identity}); return 'sent'; }
    catch (error) { return (error as {code?: string}).code; }
  }, {identity: sent.journalIdentity});
  expect(replay).toBe('not-approved');
  expect((await state(page)).sends).toBe(1);
});

test('Decline on the Review SMS card sends nothing', async ({page}) => {
  const card = await setup(page);
  await page.getByRole('button', {name: /^Decline/}).first().click();
  await expect.poll(async () => (await state(page)).decisions).toEqual(['reject']);
  expect(await state(page)).toMatchObject({sends: 0, sendSms: 0, receipts: []});
  await expect(card).toHaveCount(0);
});

const voiceCases={
  one:'Draft to Carson with one matching contact',
  two:'Draft to Carson with two matching contacts',
  none:'Draft with no contact matching the recognized name',
};
for(const contactMode of ['one','two','none'] as const) test(voiceCases[contactMode], async ({page}, info) => {
  const card = await setup(page, contactMode);
  const spoken = await page.evaluate(async (name) => {
    const {voice} = (window as any).smsCardFixture;
    const reply = await voice('Draft a text to '+name+' saying On my way.');
    return reply.speechText ?? reply.text;
  }, contactMode==='none'?'Qassem':'Carson');
  await expect(card).toBeVisible();
  await expect(card).toContainText(BODY);
  expect((await state(page)).sendSms).toBe(0);
  if(contactMode==='one'){
    await expect(card).toContainText(`Carson (${NUMBER})`);
    await expect(card).toContainText('Say “Send this text”');
    expect(spoken).toContain('confirm by voice');
    await info.attach('Addressed draft', {body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
    await page.evaluate(() => (window as any).smsCardFixture.voice('Send this text.'));
    // The host draft is retired. The distinct, explicitly confirmed device send is journaled once.
    expect(await state(page)).toMatchObject({decisions:['reject'],sends:1,refused:0,sendSms:1});
    const sent=await page.evaluate(()=>(window as any).smsCardFixture.sends[0]);
    expect(sent).toMatchObject({recipients:[NUMBER],body:BODY});
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await info.attach('One simulated send', {body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
  }else{
    await expect(card).toContainText(contactMode==='none'?'To contact: Qassem':'To contact: Carson');
    await expect(card).toContainText('Choose recipient');
    await expect(card).not.toContainText('Say “Send this text”');
    expect(spoken).toBe('Who should get this text? Say their full name or choose a recipient on your phone.');
    await info.attach('Draft asks for a recipient', {body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
    await page.evaluate(() => (window as any).smsCardFixture.voice('Send this text.'));
    expect(await state(page)).toMatchObject({decisions:[],sends:0,sendSms:0});
    if(contactMode==='two'){
      await card.click();
      const picker = page.getByRole('group',{name:'Choose a recipient'});
      const first = picker.getByRole('radio',{name:/Carson.*0199/});
      const second = picker.getByRole('radio',{name:/Carson.*0198/});
      const done = page.getByRole('button',{name:'Done',exact:true});
      await expect(done).toBeDisabled();
      await expect(page.getByRole('button',{name:'Not now',exact:true})).toBeEnabled();
      await first.check();
      await expect(done).toBeEnabled();
      await first.press('ArrowDown');
      await expect(second).toBeChecked();
      await expect(first).not.toBeChecked();
      await expect(page.locator('html')).toHaveAttribute('data-active-view','home');
      expect((await state(page)).sendSms).toBe(0);
      await info.attach('Two matching contacts', {body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
      await done.click();
      await expect(picker).toHaveCount(0);
      const draft = page.getByRole('group',{name:/Message draft to Carson.*0198/});
      await expect(draft.getByRole('textbox',{name:'Message draft',exact:true})).toHaveValue(BODY);
      expect((await state(page)).sendSms).toBe(0);
    }
  }
});
