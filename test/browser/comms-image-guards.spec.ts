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
    text: await run({type: 'sms_compose', query: 'Carmen', body: 'On my way'}),
    send: await run({type: 'sms_send', recipients: ['+15550100103'], body: 'On my way', subscriptionId: 1}),
  };
});

test.describe('Alpha image: the installed executor refuses side effects during a call that may be an emergency call (AC-19)', () => {
  test('with no call each branch reaches the bridge', async ({page}) => {
    await installedExecutor(page);
    await runAll(page);
    expect((await bridgeEffects(page)).sort()).toEqual(['contacts.save', 'dial', 'placeCall', 'sendSms', 'sendSms'].sort());
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
    expect(summaries.dial).toBe('Nothing was done during a call that may be an emergency call.');
    expect(summaries.send).toBe('Nothing was done during a call that may be an emergency call.');
  });

  /** A contact deletion: the owner picks the contact in the approved card's review, then the write runs. */
  async function removeAda(page: Page) {
    await page.evaluate(() => {
      const el = document.querySelector('[data-screen]') as any;
      let fiber = el[Object.keys(el).find(key => key.startsWith('__reactFiber$'))!];
      while (fiber && !(fiber.stateNode && typeof fiber.stateNode.cardAct === 'function')) fiber = fiber.return;
      const shell = fiber.stateNode, w = window as any;
      shell.setState({chat: 'sheet'});
      shell.propose({id: 'remove-ada', kind: 'other', title: 'Delete Ada Okafor', detail: 'Ada Okafor', button: 'Approve', acts: true, act: {mod: 'alpha', fn: 'execute'}, args: {proposalId: 'p-remove'}, proposalId: 'p-remove'}, 'Delete Ada?');
      shell.pendingActionApprovalProposalId = 'p-remove';
      w.__removal = w.__installedDeviceExecutor({type: 'contact_delete', query: 'Ada'}, crypto.randomUUID(), w.__reviewContext, new AbortController().signal)
        .then((result: any) => result.summary ?? result.status, (error: Error) => `threw: ${error.message}`);
    });
    await page.locator('[data-alpha-proposal-review] button').filter({hasText: 'Ada Okafor'}).first().click();
    return page.evaluate(() => (window as any).__removal);
  }

  test('a contact removal reaches the bridge with no call, and not during an emergency call', async ({page}) => {
    await installedExecutor(page);
    await removeAda(page);
    expect(await bridgeEffects(page)).toEqual(['contacts.remove']);
    await page.evaluate(() => { (window as any).telephonyInputs.length = 0; (window as any).setDeviceCallState({inCall: true, emergency: true, emergencyLive: true, watching: true}); });
    await removeAda(page);
    expect(await bridgeEffects(page)).toEqual([]);
  });
});
