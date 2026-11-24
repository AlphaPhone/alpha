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

  // Owner report (v609): while Telecom still said DIALING the bar said "On call · 0:00". The bar says
  // what the call screen says, and its clock counts from the connect time the call reports.
  test('a dialing call says Calling… until it is active, then counts from its connect time', async ({page}) => {
    await setupTelephony(page);
    await setCalls(page, [{id: 'call-1', state: 'dialing', connectedAt: null}]);
    await expect(bar(page)).toContainText('Calling…');
    await page.waitForTimeout(1_500);
    await expect(bar(page)).toContainText('Calling…');
    await expect(bar(page)).not.toContainText('On call');
    // Connected 42 seconds ago by Telecom's clock, long after the bar first appeared: not 0:00.
    await setCalls(page, [{id: 'call-1', state: 'active', connectedAt: Date.now() - 42_000}]);
    await expect(bar(page)).toContainText(/On call · 0:4[2-4]/);
    await expect(page.getByRole('button', {name: /^Return to call, On call · 0:4\d$/})).toBeVisible();
    // Android owns the incoming alert. Once answered, the current call gets the bar.
    await setCalls(page, [{id: 'call-2', state: 'ringing', connectedAt: null}]);
    await expect(bar(page)).toHaveCount(0);
    await setCalls(page, [{id: 'call-2', state: 'active', connectedAt: Date.now()}]);
    await expect(bar(page)).toContainText(/On call/);
  });

  // Owner report (v609): the remote side hung up just as the owner tapped the bar; the bar vanished,
  // the screen moved up, and the tap opened the Inbox card underneath. The ended call's bar keeps its
  // place as "Call ended" for a moment and takes the tap.
  test('when the call ends the bar holds its place as Call ended and swallows a tap aimed at it', async ({page}) => {
    await setupTelephony(page);
    await setCalls(page, [{id: 'call-1', state: 'active', connectedAt: Date.now() - 20_000}]);
    await expect(bar(page)).toContainText(/On call/);
    const live = await bar(page).boundingBox();
    const screenTop = await page.locator('[data-screen]').evaluate(node => node.getBoundingClientRect().top);
    // Count every click that reaches the screen (the views under the bar).
    await page.evaluate(() => {
      (window as any).screenClicks = 0;
      document.querySelector('[data-screen]')!.addEventListener('click', () => { (window as any).screenClicks++; }, true);
    });
    await setCalls(page, []);
    await expect(bar(page)).toContainText('Call ended');
    await expect(page.getByRole('status').filter({hasText: 'Call ended'})).toHaveCount(1);
    // Same place and size, and the screen has not moved up.
    expect(await bar(page).boundingBox()).toEqual(live);
    expect(await page.locator('[data-screen]').evaluate(node => node.getBoundingClientRect().top)).toBe(screenTop);
    // Nothing to return to or end: the return control is disabled and End is gone from view.
    await expect(bar(page).getByRole('button', {name: 'Call ended'})).toHaveAttribute('aria-disabled', 'true');
    await expect(bar(page).getByRole('button', {name: 'End call', exact: true})).toHaveCount(0);
    // Taps where Return and End were land on the bar and do nothing.
    await page.mouse.click(live!.x + 60, live!.y + live!.height / 2);
    await page.mouse.click(live!.x + live!.width - 26, live!.y + live!.height / 2);
    expect(await inputs(page)).toEqual([]);
    expect(await page.evaluate(() => (window as any).screenClicks)).toBe(0);
    // Then it goes, and the screen gets its full height back.
    await expect(bar(page)).toHaveCount(0, {timeout: 4_000});
    await expect.poll(() => page.locator('[data-screen]').evaluate(node => node.getBoundingClientRect().top)).toBeLessThan(screenTop);
  });

  test('ending the call from the bar shows Call ended, and a second tap does nothing', async ({page}) => {
    await setupTelephony(page);
    await setCalls(page, [{id: 'call-1', state: 'active', connectedAt: Date.now() - 5_000}]);
    const end = page.getByRole('button', {name: 'End call', exact: true});
    const box = (await end.boundingBox())!;
    await end.click();
    await expect(bar(page)).toContainText('Call ended');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    expect(await inputs(page)).toEqual([['endCall', {id: 'call-1'}]]);
    await expect(bar(page)).toHaveCount(0, {timeout: 4_000});
  });

  test('an incoming call clears the app bar during the Call ended moment', async ({page}) => {
    await setupTelephony(page);
    await setCalls(page, [{id: 'call-1', state: 'active', connectedAt: Date.now() - 5_000}]);
    await expect(bar(page)).toContainText(/On call/);
    await setCalls(page, []);
    await expect(bar(page)).toContainText('Call ended');
    await setCalls(page, [{id: 'call-2', state: 'ringing', connectedAt: null}]);
    await expect(bar(page)).toHaveCount(0);
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

  test('a held call bar returns once the incoming alert is gone', async ({page}) => {
    await setupTelephony(page);
    await setCalls(page, [{id: 'call-1', state: 'held', connectedAt: Date.now() - 10_000}]);
    await expect(bar(page)).toContainText('On hold');
    await expect(page.getByRole('button', {name: 'End call', exact: true})).toBeVisible();
    await setCalls(page, [
      {id: 'call-1', state: 'held', connectedAt: Date.now() - 10_000},
      {id: 'call-2', state: 'ringing', connectedAt: null},
    ]);
    await expect(bar(page)).toHaveCount(0);
    await setCalls(page, [{id: 'call-1', state: 'held', connectedAt: Date.now() - 10_000}]);
    await expect(bar(page)).toContainText('On hold');
    expect(await inputs(page)).toEqual([]);
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

  test('a malformed reading during a call removes the bar at once rather than claiming the call ended', async ({page}) => {
    await setupTelephony(page);
    await setCalls(page, [{id: 'call-1', state: 'active', connectedAt: Date.now() - 5_000}]);
    await expect(bar(page)).toContainText(/On call/);
    await setCalls(page, [{id: 'call-1', state: 'ringing-loudly', connectedAt: null}]);
    await expect(bar(page)).toHaveCount(0, {timeout: 1_000});
  });
});

// The reviewer's finding on #1328: at the 412x915 native-phone layout the bar covered the header
// controls of nearly every view. The bar now takes layout space: the screen starts below it. For each
// main view, every control in the top band must sit wholly below the bar and be the element a tap at
// its centre reaches.
const shellInit = () => {
  (window as any).alphaShell = () => {
    const screen = document.querySelector('[data-screen]') as any;
    let fiber = screen[Object.keys(screen).find(name => name.startsWith('__reactFiber$'))!];
    while (fiber && !(fiber.stateNode && typeof fiber.stateNode.openView === 'function')) fiber = fiber.return;
    return fiber.stateNode;
  };
};
const MAIN_VIEWS = ['home', 'phone', 'messages', 'contacts', 'settings', 'calendar', 'photos', 'workflows', 'notes', 'inbox', 'files', 'maps', 'browser'];

/** The top band's controls, each with its box and whether a tap at its centre reaches it. */
const topControls = (page: Page) => page.evaluate(() => {
  const bar = document.querySelector('[data-alpha-call-bar]')!.getBoundingClientRect();
  const screen = document.querySelector('[data-screen]')!;
  const band = bar.bottom + 160;
  return [...screen.querySelectorAll<HTMLElement>('button,a[href],input,[role="tab"],[role="button"],[role="link"],select,textarea')]
    .filter(node => !node.closest('[inert],[aria-hidden="true"]') && node.checkVisibility({contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true}))
    .map(node => ({node, box: node.getBoundingClientRect()}))
    .filter(({box}) => box.width > 0 && box.height > 0 && box.top < band && box.bottom > 0)
    .map(({node, box}) => {
      const x = Math.min(Math.max(box.left + box.width / 2, 1), innerWidth - 1), y = Math.min(Math.max(box.top + box.height / 2, 1), innerHeight - 1);
      const hit = document.elementFromPoint(x, y);
      return {
        name: (node.getAttribute('aria-label') || node.textContent || node.tagName).trim().slice(0, 40),
        top: box.top, bottom: box.bottom, left: box.left, right: box.right,
        reachable: !!hit && (node === hit || node.contains(hit) || hit.contains(node)),
        hitInBar: !!hit?.closest('[data-alpha-call-bar]'),
        hit: hit ? `${hit.tagName} ${hit.getAttribute('aria-label') || ''} ${hit.className || ''}`.slice(0, 80) : 'nothing',
      };
    });
});
const barBox = async (page: Page) => (await bar(page).boundingBox())!;

test.describe('the ongoing-call bar takes layout space', () => {
  for (const inset of [0, 40]) {
    test(`no main view's header controls are under the bar (native top inset ${inset}px)`, async ({page}) => {
      test.setTimeout(90_000);
      await page.addInitScript(shellInit);
      await setupTelephony(page);
      if (inset) await page.evaluate(px => document.documentElement.style.setProperty('--native-top-inset', `${px}px`), inset);
      await setCalls(page, [{id: 'call-1', state: 'active', connectedAt: Date.now() - 5_000}]);
      await expect(bar(page)).toBeVisible();
      const box = await barBox(page);
      // Below the status bar (the native inset), and the screen starts below the bar.
      expect(box.y).toBeGreaterThanOrEqual(inset);
      for (const view of MAIN_VIEWS) {
        await page.evaluate(name => name === 'home' ? (window as any).alphaShell().goHome() : (window as any).alphaShell().openView(name), view);
        await expect(bar(page)).toBeVisible();
        await page.waitForTimeout(500);
        const screenTop = await page.locator('[data-screen]').evaluate(node => node.getBoundingClientRect().top);
        expect(screenTop, `${view}: the screen starts below the bar`).toBeGreaterThanOrEqual(box.y + box.height);
        const controls = await topControls(page);
        expect(controls.length, `${view} has header controls to check`).toBeGreaterThan(0);
        for (const control of controls) {
          const label = `${view}: "${control.name}"`;
          expect(control.top, `${label} starts below the bar`).toBeGreaterThanOrEqual(box.y + box.height);
          expect(control.hitInBar, `${label} is not under the bar`).toBe(false);
          expect(control.reachable, `${label} receives a tap at its centre (reached ${control.hit}; box ${control.left},${control.top}-${control.right},${control.bottom})`).toBe(true);
        }
      }
      // The named controls the review found covered.
      await page.evaluate(() => (window as any).alphaShell().openView('messages'));
      await page.getByRole('button', {name: 'New message'}).click({trial: true});
      await page.evaluate(() => (window as any).alphaShell().openView('settings'));
      await page.getByRole('button', {name: /^Account/}).first().click({trial: true});
      // Ending the call gives the screen its full height back.
      await setCalls(page, []);
      await expect(bar(page)).toHaveCount(0);
      await expect.poll(() => page.locator('[data-screen]').evaluate(node => node.getBoundingClientRect().top)).toBe(0);
    });
  }
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
