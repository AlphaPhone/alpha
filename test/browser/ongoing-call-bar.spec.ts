import {test, expect, type Page} from '@playwright/test';
import {setupTelephony} from './telephony-fixture';

// Owner issue 4 on the Alpha image: a call keeps going after the owner leaves the native call
// screen (AlphaCallActivity). The WebView then shows a bar at the top with the call's state, which
// returns to the call screen or ends the call through AlphaOngoingCall (TelecomCallService, the same
// disconnect the call screen's End uses). Capacitor is faked only at the bridge
// (telephony-fixture.ts): no device, Telecom or radio is involved, so this is renderer evidence only.

const bar = (page: Page) => page.getByRole('region', {name: 'Ongoing call'});
const inputs = (page: Page) => page.evaluate(() => ((window as any).ongoingCallInputs as [string, any][])
  .filter(([method]) => method === 'showCall' || method === 'endCall'));
const setCalls = (page: Page, calls: unknown) => page.evaluate(next => (window as any).setOngoingCalls(next), calls);

test.describe('Alpha image: ongoing call bar', () => {
  test('no bar without a live call', async ({page}) => {
    await setupTelephony(page);
    await expect(page.getByRole('button', {name: 'Notes', exact: true})).toBeVisible();
    await expect(bar(page)).toHaveCount(0);
    await expect(page.getByRole('button', {name: /^Return to call/})).toHaveCount(0);
  });

  test('a dialing call left in the background shows a bar that returns to the call screen', async ({page}) => {
    await setupTelephony(page);
    await setCalls(page, [{id: 'call-1', state: 'dialing', connectedAt: null}]);
    await expect(bar(page)).toBeVisible();
    await expect(bar(page)).toContainText('Calling…');
    await page.getByRole('button', {name: 'Return to call, Calling…'}).click();
    expect(await inputs(page)).toEqual([['showCall', {id: 'call-1'}]]);
  });

  test('End call disconnects the shown call and the bar goes when Telecom removes it', async ({page}) => {
    await setupTelephony(page);
    await setCalls(page, [{id: 'call-1', state: 'active', connectedAt: Date.now() - 65_000}]);
    await expect(bar(page)).toContainText(/On call · 1:0\d/);
    await page.getByRole('button', {name: 'End call', exact: true}).click();
    expect(await inputs(page)).toEqual([['endCall', {id: 'call-1'}]]);
    await expect(bar(page)).toHaveCount(0);
  });

  test('the bar stays over every view while the call is live, and its clock runs', async ({page}) => {
    await setupTelephony(page);
    await setCalls(page, [{id: 'call-1', state: 'active', connectedAt: Date.now() - 3_000}]);
    await page.getByRole('button', {name: 'Notes', exact: true}).first().click();
    await expect(bar(page)).toBeVisible();
    const first = await bar(page).textContent();
    await expect.poll(async () => await bar(page).textContent(), {timeout: 5_000}).not.toBe(first);
  });

  test('a held call and a ringing call name their state; a ringing call offers Decline', async ({page}) => {
    await setupTelephony(page);
    await setCalls(page, [{id: 'call-1', state: 'held', connectedAt: Date.now() - 10_000}]);
    await expect(bar(page)).toContainText('On hold');
    await expect(page.getByRole('button', {name: 'End call', exact: true})).toBeVisible();
    await setCalls(page, [{id: 'call-2', state: 'ringing', connectedAt: null}]);
    await expect(bar(page)).toContainText('Incoming call');
    await page.getByRole('button', {name: 'Decline', exact: true}).click();
    expect(await inputs(page)).toEqual([['endCall', {id: 'call-2'}]]);
  });

  test('the bar sits below the native top inset', async ({page}) => {
    await setupTelephony(page);
    await page.evaluate(() => document.documentElement.style.setProperty('--native-top-inset', '40px'));
    await setCalls(page, [{id: 'call-1', state: 'dialing', connectedAt: null}]);
    const box = await bar(page).boundingBox();
    expect(box?.y ?? 0).toBeGreaterThanOrEqual(40);
  });

  test('a malformed reading shows no bar', async ({page}) => {
    await setupTelephony(page);
    await setCalls(page, [{id: 'call-1', state: 'dialing', connectedAt: null, number: '+15550100103'}]);
    await setCalls(page, [{id: 'call-1', state: 'ringing-loudly', connectedAt: null}]);
    await expect(bar(page)).toHaveCount(0);
  });
});

// The development phone (?fixture=1&mode=dev): its simulated call screen is the Phone view. Nothing
// here reaches Telecom or a radio.
test.describe('fixture dev build: ongoing call bar over the simulated phone', () => {
  test.beforeEach(async ({page}) => {
    await page.addInitScript(() => {
      localStorage.setItem('alpha.connection.selection.v1', JSON.stringify({kind: 'offline'}));
      (window as any).alphaShell = () => {
        const screen = document.querySelector('[data-screen]') as any;
        let fiber = screen[Object.keys(screen).find(name => name.startsWith('__reactFiber$'))!];
        while (fiber && !(fiber.stateNode && typeof fiber.stateNode.openView === 'function')) fiber = fiber.return;
        return fiber.stateNode;
      };
    });
    await page.goto('/?fixture=1&mode=dev&start=phone:keypad');
    for (const key of ['5', '5', '5', '0', '1', '0', '0']) await page.getByRole('button', {name: key, exact: true}).click();
    await page.getByRole('button', {name: 'Call', exact: true}).click();
    await expect(page.locator('[data-alpha-call-card]')).toBeVisible();
  });

  test('no bar on the call screen; leaving it shows the bar, which returns to the call', async ({page}) => {
    await expect(bar(page)).toHaveCount(0);
    await page.evaluate(() => (window as any).alphaShell().goHome());
    await expect(bar(page)).toBeVisible();
    await expect(bar(page)).toContainText(/Calling…|On call · 0:0\d/);
    await page.evaluate(() => (window as any).alphaShell().openView('notes'));
    await expect(bar(page)).toBeVisible();
    await bar(page).getByRole('button', {name: /^Return to call, /}).click();
    await expect(page.locator('[data-alpha-call-card]')).toBeVisible();
    await expect(bar(page)).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).alphaShell().vget('phone').callWho)).not.toBeNull();
  });

  test('End call from the bar hangs up through the call screen\'s own hang-up', async ({page}) => {
    await page.evaluate(() => (window as any).alphaShell().goHome());
    await expect(bar(page).getByText(/On call · 0:0\d/)).toBeVisible({timeout: 6_000});
    await bar(page).getByRole('button', {name: 'End call', exact: true}).click();
    await expect(bar(page)).toHaveCount(0);
    const shell = await page.evaluate(() => { const phone = (window as any).alphaShell().vget('phone'); return {callWho: phone.callWho, latest: phone.recents[0]}; });
    expect(shell.callWho).toBeNull();
    expect(shell.latest).toMatchObject({dir: 'out'});
  });
});
