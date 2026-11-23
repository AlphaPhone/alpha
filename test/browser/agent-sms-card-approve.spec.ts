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

async function setup(page: Page, contactMode?: 'one' | 'two' | 'none', reviewFirst=true, bindRequest=true) {
  await page.addInitScript(installTelephonyFixture, {});
  await page.addInitScript(({number, body, contactMode, reviewFirst, bindRequest}) => {
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
    localStorage.setItem('alpha.browser.device.v1',JSON.stringify({askBeforeAgentActions:reviewFirst}));
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
          payload: {action: 'device_action', version: 1, installationId: w.smsCardInstallation, enrollmentId: 'fixture-enrollment', ...(contactMode&&bindRequest?{requestMessageId:'22222222-2222-4222-8222-222222222222'}:{}), operation: {type: 'sms_compose', target: contactMode ? {kind:'contact', query:contactMode==='none'?'Qassem':'Carson'} : {kind: 'number', number}, body, ...(contactMode ? {draft:true} : {})}}};
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
  }, {number: NUMBER, body: BODY, contactMode, reviewFirst, bindRequest});
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
    return page.getByRole('region', {name: 'Review SMS'});
  }
  const input = page.getByRole('textbox', {name: 'Ask Alpha', exact: true});
  await input.fill(`Text ${NUMBER}: ${BODY}`);
  await input.press('Enter');
  const card = page.getByRole('region', {name: 'Review SMS'});
  await expect(card).toBeVisible();
  return card;
}
const state = (page: Page) => page.evaluate(() => {
  const f = (window as any).smsCardFixture;
  return {decisions: f.decisions, sends: f.sends.length, refused: f.refused.length, receipts: f.receipts.map((receipt: any) => receipt.outcome), journalEntries:f.journal.size, sendSms: ((window as any).telephonyCalls as string[]).filter(method => method === 'sendSms').length};
});


test('a tap on Send dispatches once and does not open another dialog', async ({page}) => {
  const card = await setup(page);
  await expect(card.getByText(`To ${NUMBER}`, {exact: true})).toBeVisible();
  await expect(card.locator('[data-alpha-telephony-review-body]')).toHaveText(BODY);
  await expect(card).not.toContainText('From:');
  expect((await state(page)).sends).toBe(0);
  await card.getByRole('button', {name: 'Review SMS: Send'}).click();
  await expect.poll(async () => (await state(page)).receipts).toEqual(['applied']);
  expect(await state(page)).toMatchObject({decisions: ['approve'], sends: 1, refused: 0, sendSms: 1});
  const sent = await page.evaluate(() => (window as any).smsCardFixture.sends[0]);
  expect(sent).toMatchObject({recipients: [NUMBER], body: BODY, operationId: 'fixture-proposal'});
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Don’t send settles the review without dispatching', async ({page}) => {
  const card = await setup(page);
  await card.getByRole('button', {name: 'Don’t send'}).click();
  await expect.poll(async () => (await state(page)).decisions).toEqual(['reject']);
  expect(await state(page)).toMatchObject({sends: 0, sendSms: 0, receipts: []});
  await expect(card).toHaveCount(0);
});

for(const enabled of [true,false])test(`one Talk confirmation sends with approvals ${enabled?'on':'off'}`,async({page})=>{
  const card=await setup(page,'one',enabled);
  const reply=await page.evaluate(()=>(window as any).smsCardFixture.voice('Send a text to Carson. On my way.'));
  expect(reply.reviewRequired).toBeUndefined();
  expect(reply.speechText).toContain('Send this text');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText(`Carson (${NUMBER})`);
  await expect(card.locator('[data-alpha-telephony-review-body]')).toHaveText(BODY);
  expect((await state(page)).sendSms).toBe(0);
  await expect.poll(()=>page.evaluate(()=>{
    const button=document.querySelector<HTMLButtonElement>('[data-alpha-sms-review] [data-alpha-sms-send]');
    if(!button||button.disabled)return false;
    button.scrollIntoView({block:'nearest'});
    const rect=button.getBoundingClientRect();
    return button.contains(document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2));
  })).toBe(true);
  if(!enabled&&process.env.ALPHA_SMS_REVIEW_CAPTURE)await page.screenshot({path:`${process.env.ALPHA_SMS_REVIEW_CAPTURE}/SMS review.png`});
  const confirmation=enabled?'Hmm, send this.':'Send this text.';
  const confirmed=await page.evaluate(text=>(window as any).smsCardFixture.voice(text),confirmation);
  expect(confirmed.text).toBe('Message sent.');
  const sent=page.getByText('Message sent.',{exact:true});
  await expect(sent).toHaveCount(1);
  await expect(sent).toBeVisible();
  const said=await page.getByText(confirmation,{exact:true}).boundingBox();
  const shown=await sent.boundingBox();
  expect(shown!.y).toBeGreaterThan(said!.y);

  await expect(card).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-active-view','home');
  if(!enabled&&process.env.ALPHA_SMS_REVIEW_CAPTURE)await page.screenshot({path:`${process.env.ALPHA_SMS_REVIEW_CAPTURE}/SMS sent.png`});
  const repeated=await page.evaluate(()=>(window as any).smsCardFixture.voice('Send this text.'));
  expect(repeated.text).toBe('There is no text ready to send.');
  const sends=await page.evaluate(()=>(window as any).smsCardFixture.sends);
  expect(sends).toHaveLength(1);
  expect(sends[0]).toMatchObject({recipients:[NUMBER],body:BODY});
});

test('a name with two matches cannot send on a spoken confirmation',async({page})=>{
  const card=await setup(page,'two',false);
  await page.evaluate(()=>(window as any).smsCardFixture.voice('Send a text to Carson saying On my way'));
  await expect(card.getByRole('button',{name:'Review SMS: Choose recipient'})).toBeVisible();
  await page.evaluate(()=>(window as any).smsCardFixture.voice('Send this text.'));
  expect(await state(page)).toMatchObject({decisions:[],sends:0,sendSms:0,journalEntries:0});
  await card.getByRole('button',{name:'Review SMS: Choose recipient'}).click();
  const options=card.getByRole('group',{name:'Choose a recipient'});
  const send=card.getByRole('button',{name:'Send',exact:true});
  await expect(send).toBeDisabled();
  await options.getByRole('radio').first().check();
  await options.getByRole('radio').last().check();
  await expect(options.getByRole('radio',{checked:true})).toHaveCount(1);
  await expect(send).toBeEnabled();
  expect((await state(page)).sends).toBe(0);
  await card.getByRole('button',{name:'Not now',exact:true}).click();
  expect((await state(page)).sends).toBe(0);
});

test('an explicit draft stays unsent until confirmation with approvals off',async({page})=>{
  const card=await setup(page,'one',false);
  await page.evaluate(()=>(window as any).smsCardFixture.voice('Draft a text to Carson saying On my way'));
  await expect(card).toContainText(BODY);
  expect((await state(page)).sendSms).toBe(0);
});

test('a pending review that belongs to another turn cannot be spoken for',async({page})=>{
  const card=await setup(page,'one',false,false);
  await page.evaluate(()=>(window as any).smsCardFixture.voice('Send a text to Carson saying On my way'));
  await expect(card).toHaveCount(1);
  const answer=await page.evaluate(()=>(window as any).smsCardFixture.voice('Send this text.'));
  expect(answer.text).toBe('There is no text ready to send.');
  expect((await state(page)).sends).toBe(0);
});
