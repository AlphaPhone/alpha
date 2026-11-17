import {test, expect, type Page} from '@playwright/test';
import {setupTelephony} from './telephony-fixture';

// AP-16 AC-19 on the Alpha image: the executor installAgentAdapter registers, driven for its
// phone-dial, telephony-action and sms-send branches with Capacitor faked only at the bridge
// (telephony-fixture.ts: AlphaCallState, AlphaTelephony, AlphaContacts). The test reaches the
// installed executor by recording what connectionController.setDeviceExecutor receives; nothing
// else in the app is replaced except the session and context the review fence compares against.
// Renderer evidence only: no device, Telecom, radio or address book.

const bridgeEffects = (page: Page) => page.evaluate(() => ((window as any).telephonyInputs as [string, any][])
  .map(([method]) => method).filter(method => ['dial', 'placeCall', 'sendSms', 'contacts.save', 'contacts.remove'].includes(method)));

async function installedExecutor(page: Page) {
  await page.route(/\/src\/runtime\/connection-ui\.tsx/, async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/setDeviceExecutor\(executor\)\s*\{\s*deviceExecutor = executor;/, match => `${match} globalThis.__installedDeviceExecutor = executor;`);
    if (!body.includes('__installedDeviceExecutor')) throw Error('setDeviceExecutor not found in connection-ui');
    await route.fulfill({response, body});
  });
  await setupTelephony(page);
  await page.getByRole('button', {name: 'Messages', exact: true}).first().click();
  await expect.poll(() => page.evaluate(() => typeof (window as any).__installedDeviceExecutor)).toBe('function');
  // The review fence compares the agent session and screen context; hold both steady as a live review would.
  await page.evaluate(async () => {
    const {connectionController} = await import('/src/runtime/connection-ui.tsx' as string);
    const {alphaClient} = await import('/src/runtime/alpha-client.ts' as string);
    const {smsSubscriptionRevision} = await import('/src/runtime/sms-subscription-revision.ts' as string);
    const session = {ownerId: 'owner', agentId: 'agent', origin: 'https://agent.example', sessionId: 'session'};
    const snapshot = connectionController.getSnapshot.bind(connectionController);
    connectionController.getSnapshot = () => ({...snapshot(), session});
    const target = {installationId: 'device'};
    connectionController.getWorkflowDeviceTarget = () => target;
    const state = alphaClient.getState.bind(alphaClient);
    const context = {...state().context, view: 'messages', sensitive: false,
      selectedObject: {kind: 'sms-subscription', id: '1', revision: smsSubscriptionRevision({slot: 0, carrierName: 'Synthetic Carrier'})}};
    alphaClient.getState = () => ({...state(), context});
    (window as any).__reviewContext = context;
  });
}
/** Runs each guarded branch of the installed executor once; returns their summaries. */
const runAll = (page: Page) => page.evaluate(async () => {
  const w = window as any, run = (operation: unknown) => w.__installedDeviceExecutor(operation, crypto.randomUUID(), w.__reviewContext, new AbortController().signal)
    .then((result: any) => result.summary ?? result.status, (error: Error) => `threw: ${error.message}`);
  return {
    dial: await run({type: 'phone_dial', target: {kind: 'number', number: '+15550100103'}}),
    call: await run({type: 'phone_call', target: {kind: 'number', number: '+15550100103'}}),
    create: await run({type: 'contact_create', contact: {displayName: 'Nia Brooks', phoneNumbers: ['+15550100199'], emailAddresses: []}}),
    send: await run({type: 'sms_send', recipients: ['+15550100103'], body: 'On my way', subscriptionId: 1}),
  };
});

/**
 * An action the owner confirms on the phone: its approved card carries the review (who matched, or
 * the contact to delete), `pick` chooses a row or 'Not now', and the executor's summary is returned.
 */
async function reviewed(page: Page, operation: Record<string, unknown>, pick: string, seen: (review: ReturnType<Page['locator']>) => Promise<void> = async () => {}) {
  await page.evaluate(operation => {
    const el = document.querySelector('[data-screen]') as any;
    let fiber = el[Object.keys(el).find(key => key.startsWith('__reactFiber$'))!];
    while (fiber && !(fiber.stateNode && typeof fiber.stateNode.cardAct === 'function')) fiber = fiber.return;
    const shell = fiber.stateNode, w = window as any, id = `p-${operation.type}`;
    shell.setState({chat: 'sheet'});
    shell.propose({id, kind: 'other', title: 'Reviewed action', detail: String(operation.query), button: 'Approve', acts: true, act: {mod: 'alpha', fn: 'execute'}, args: {proposalId: id}, proposalId: id}, 'Review?');
    shell.pendingActionApprovalProposalId = id;
    w.__reviewed = w.__installedDeviceExecutor(operation, crypto.randomUUID(), w.__reviewContext, new AbortController().signal)
      .then((result: any) => result.summary ?? result.status, (error: Error) => `threw: ${error.message}`);
  }, operation);
  const review = page.locator('[data-alpha-proposal-review]').first();
  await expect(review).toBeVisible();
  await seen(review);
  await review.locator('button').filter({hasText: pick}).first().click();
  return page.evaluate(() => (window as any).__reviewed);
}
const textCarmen = {type: 'sms_compose', query: 'Carmen', body: 'On my way'};

test.describe('Alpha image: the installed executor refuses side effects during a call that may be an emergency call (AC-19)', () => {
  test('with no call each branch reaches the bridge', async ({page}) => {
    await installedExecutor(page);
    await runAll(page);
    await reviewed(page, textCarmen, 'Carmen');
    expect((await bridgeEffects(page)).sort()).toEqual(['contacts.save', 'dial', 'placeCall', 'sendSms', 'sendSms'].sort());
  });

  test('a text to one matching contact shows the matched name and number before the native review opens', async ({page}) => {
    await installedExecutor(page);
    // Dismissed: the owner saw who matched and nothing reached the bridge.
    const dismissed = await reviewed(page, textCarmen, 'Not now', async review => {
      await expect(review.locator('[data-alpha-telephony-review-body]')).toHaveText('On my way');
      await expect(review.getByRole('button', {name: /^Message Carmen .*555.*0103/})).toHaveCount(1);
      expect(await bridgeEffects(page)).toEqual([]);
    });
    expect(dismissed).toBe('The owner dismissed the message. Nothing was sent.');
    expect(await bridgeEffects(page)).toEqual([]);
    // Chosen: the same number goes to the native review.
    await reviewed(page, textCarmen, 'Carmen');
    expect(await bridgeEffects(page)).toEqual(['sendSms']);
    expect(await page.evaluate(() => ((window as any).telephonyInputs as [string, any][]).find(([method]) => method === 'sendSms')![1].recipients)).toEqual(['+15550100103']);
  });

  for (const [name, state] of [
    ['an emergency call', {inCall: true, emergency: true, emergencyLive: true, watching: true}],
    ['a call of unknown kind', {inCall: true, emergency: null, emergencyLive: true, watching: true}],
    ['unreadable phone state', {inCall: null, emergency: null, emergencyLive: false, watching: false}],
  ] as const) test(`during ${name} nothing reaches the bridge`, async ({page}) => {
    await installedExecutor(page);
    await page.evaluate(state => (window as any).setDeviceCallState(state), state);
    const summaries = await runAll(page);
    expect(await bridgeEffects(page)).toEqual([]);
    // Every branch says why, in the same words: not "another call was in progress", not an unconfirmed result.
    expect(summaries).toEqual(Object.fromEntries(Object.keys(summaries).map(branch => [branch, 'Nothing was done during a call that may be an emergency call.'])));
  });

  /** A contact deletion: the owner picks the contact in the approved card's review, then the write runs. */
  const removeAda = (page: Page) => reviewed(page, {type: 'contact_delete', query: 'Ada'}, 'Ada Okafor');

  test('a contact removal reaches the bridge with no call, and not during an emergency call', async ({page}) => {
    await installedExecutor(page);
    await removeAda(page);
    expect(await bridgeEffects(page)).toEqual(['contacts.remove']);
    await page.evaluate(() => { (window as any).telephonyInputs.length = 0; (window as any).setDeviceCallState({inCall: true, emergency: true, emergencyLive: true, watching: true}); });
    await removeAda(page);
    expect(await bridgeEffects(page)).toEqual([]);
  });
});

/**
 * Runs one operation on the installed executor with the review fence held on `view`, as a live
 * review on that screen would hold it. The whole result stays on the page so its `present` step
 * (the view change the coordinator runs after the receipt) can be run next.
 */
const execute = (page: Page, operation: Record<string, unknown>, view: 'home' | 'messages' | 'contacts') => page.evaluate(async ({operation, view}) => {
  const {alphaClient} = await import('/src/runtime/alpha-client.ts' as string);
  const w = window as any, held = alphaClient.getState(), context = {...held.context, view, selectedObject: undefined};
  alphaClient.getState = () => ({...held, context});
  const result = w.__lastExecution = await w.__installedDeviceExecutor(operation, crypto.randomUUID(), context, new AbortController().signal);
  return {result: result.telephonyResult, summary: result.summary as string, presents: typeof result.present === 'function'};
}, {operation, view});
const present = (page: Page) => page.evaluate(() => (window as any).__lastExecution.present());
const shell = (page: Page, act: 'goHome') => page.evaluate(act => {
  const el = document.querySelector('[data-screen]') as any;
  let fiber = el[Object.keys(el).find(key => key.startsWith('__reactFiber$'))!];
  while (fiber && !(fiber.stateNode && typeof fiber.stateNode.cardAct === 'function')) fiber = fiber.return;
  fiber.stateNode[act]();
}, act);
const sent = (page: Page) => page.evaluate(() => ((window as any).telephonyInputs as [string, any][]).filter(([method]) => method === 'sendSms').map(([, input]) => ({recipients: input.recipients, subscriptionId: input.subscriptionId})));

test.describe('Alpha image: a text to a number, a draft, and Contacts from chat (sms.compose.v2, contacts.write.v2, contacts.show.v1, contacts.read.v1)', () => {
  test('a text to an exact number opens the native review from Home on the default SIM, with no second choice', async ({page}) => {
    await installedExecutor(page);
    await shell(page, 'goHome');
    const {result} = await execute(page, {type: 'sms_compose', target: {kind: 'number', number: '+15550100199'}, body: 'On my way'}, 'home');
    // The stubbed bridge answers the review with no receipt, so only what reached it is checked.
    expect(result.kind).toBe('sms-compose');
    expect(await sent(page)).toEqual([{recipients: ['+15550100199'], subscriptionId: 1}]);
    await expect(page.locator('[data-alpha-proposal-review]')).toHaveCount(0);
  });

  test('a draft-only text opens that conversation with the text in its field, after the receipt, and sends nothing', async ({page}) => {
    await installedExecutor(page);
    await shell(page, 'goHome');
    const draft = (number: string) => ({type: 'sms_compose', target: {kind: 'number', number}, body: 'See you at 7', draft: true});
    // Carmen's conversation exists: it is the one opened.
    let outcome = await execute(page, draft('+15550100103'), 'home');
    expect(outcome).toEqual({result: {kind: 'sms-compose', status: 'drafted'}, summary: expect.stringContaining('Nothing was sent'), presents: true});
    await expect(page.locator('[data-alpha-messages-title]')).toHaveCount(0);
    await present(page);
    await expect(page.locator('[data-alpha-messages-title]')).toHaveText('Carmen Ruiz');
    await expect(page.getByRole('textbox', {name: 'Text Carmen', exact: true})).toHaveValue('See you at 7');
    // A number with no conversation yet: a new message addressed to it.
    outcome = await execute(page, draft('+15550100177'), 'messages');
    expect(outcome.result).toEqual({kind: 'sms-compose', status: 'drafted'});
    await present(page);
    await expect(page.locator('[data-alpha-messages-recipients]')).toHaveValue('+15550100177');
    await expect(page.getByRole('group', {name: 'Assistant controls'}).getByRole('textbox')).toHaveValue('See you at 7');
    await expect.poll(() => page.evaluate(() => ((window as any).telephonyInputs as [string, any][]).some(([method]) => method === 'sendSms'))).toBe(false);
    expect(await bridgeEffects(page)).toEqual([]);
  });

  test('adding one number to a contact shows the contact before and after and saves every value it had', async ({page}) => {
    await installedExecutor(page);
    await reviewed(page, {type: 'contact_update', query: 'Ada', add: {phoneNumbers: ['+15550100150']}}, 'Ada Okafor', async review => {
      await expect(review.getByRole('button', {name: 'Save changes to Ada Okafor'})).toHaveCount(1);
      await expect(review).toContainText('0101'); await expect(review).toContainText('0150'); await expect(review).toContainText('ada@example.invalid');
      await expect(review).not.toContainText('Replace');
    });
    const saves = await page.evaluate(() => ((window as any).telephonyInputs as [string, any][]).filter(([method]) => method === 'contacts.save').map(([, input]) => input));
    expect(saves).toEqual([expect.objectContaining({id: '11', displayName: 'Ada Okafor',
      phoneNumbers: [{number: '+15550100101', type: 'mobile'}, {number: '+15550100150', type: 'mobile'}], emailAddresses: [{address: 'ada@example.invalid', type: 'home'}]})]);
  });

  test('showing a contact opens Contacts filtered to the matches and reports only that there was one', async ({page}) => {
    await installedExecutor(page);
    await shell(page, 'goHome');
    expect(await execute(page, {type: 'contact_show', query: 'Zed'}, 'home')).toEqual({result: {kind: 'contact-show', status: 'not-found'}, summary: 'No matching contact was found on the phone.', presents: false});
    const outcome = await execute(page, {type: 'contact_show', query: 'Carmen'}, 'home');
    expect(outcome.result).toEqual({kind: 'contact-show', status: 'shown'});
    expect(JSON.stringify(outcome)).not.toMatch(/Ruiz|0103/);
    await present(page);
    await expect(page.getByRole('button', {name: 'Clear filter Carmen', exact: true})).toBeVisible();
    const rows = page.locator('[data-alpha-layer="app"] button.tap');
    await expect(rows.filter({hasText: 'Carmen Ruiz'})).toHaveCount(1);
    await expect(rows.filter({hasText: 'Ada Okafor'})).toHaveCount(0);
  });

  test('the open contact is shared whole; with no contact open nothing is read', async ({page}) => {
    await installedExecutor(page);
    await shell(page, 'goHome');
    await page.getByRole('button', {name: 'Contacts', exact: true}).first().click();
    await expect(page.getByRole('button', {name: /Ada Okafor/}).first()).toBeVisible();
    expect((await execute(page, {type: 'contact_read_selected'}, 'contacts')).result).toEqual({kind: 'contact-read', status: 'none-selected'});
    // The open contact and its version are the selection an approval is bound to; it stays on the phone.
    const selection = () => page.evaluate(async () => (await import('/src/prototype/contacts-adapter.ts' as string)).openContactSelection());
    expect(await selection()).toBeNull();
    await page.getByRole('button', {name: /Ada Okafor/}).first().click();
    await expect.poll(selection).toBe(JSON.stringify(['11', '11'.padStart(64, 'a')]));
    await expect.poll(async () => (await execute(page, {type: 'contact_read_selected'}, 'contacts')).result).toEqual(
      {kind: 'contact-read', status: 'read', contact: {displayName: 'Ada Okafor', phoneNumbers: ['+15550100101'], emailAddresses: ['ada@example.invalid']}});
  });
});
