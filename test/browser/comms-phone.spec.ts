import {test, expect, type Page} from '@playwright/test';
import {setupTelephony} from './telephony-fixture';
// AP-16 Phone (docs/agentic-comms.md AC-03, AC-17 to AC-22) in the browser. Evidence for the
// renderer only: the fixture call is simulated, and nothing here proves a Telecom call, a dial
// intent or the Alpha image's own call screen (AGENTS.md).

/** The shell component, reached through the rendered tree like shell-toast.spec.ts. */
async function shellInit(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('alpha.connection.selection.v1', JSON.stringify({kind: 'offline'}));
    (window as any).alphaShell = () => {
      const screen = document.querySelector('[data-screen]') as any;
      let fiber = screen[Object.keys(screen).find(name => name.startsWith('__reactFiber$'))!];
      while (fiber && !(fiber.stateNode && typeof fiber.stateNode.openView === 'function')) fiber = fiber.return;
      return fiber.stateNode;
    };
  });
}
/** Relative luminance contrast of two computed CSS colors. */
function contrast(a: string, b: string) {
  const lum = (color: string) => {
    const [r, g, b2] = (color.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return .2126 * r + .7152 * g + .0722 * b2;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + .05) / (y + .05);
}
/** The element at the center of a selector's box is that element (or inside it). */
async function hits(page: Page, selector: string) {
  return page.evaluate(selector => {
    const element = document.querySelector(selector);
    if (!element) return false;
    const box = element.getBoundingClientRect();
    const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return !!top && (top === element || element.contains(top));
  }, selector);
}
const recents = async (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('alpha.dev.app.phone') || '{"recents":[]}').recents.filter((row: any) => row.at));
const openAlpha = (page: Page) => page.getByRole('button', {name: 'Open Alpha', exact: true}).click();
async function askAlpha(page: Page, text: string) {
  const field = page.locator('[data-alpha-bar-field="alpha"]:visible');
  await field.fill(text);
  await field.press('Enter');
}

test.describe('fixture dev build (?fixture=1&mode=dev, ELIZA_DEV_ALLOW_TEST_MOCKS=1): call card', () => {
  test.beforeEach(async ({page}) => { await shellInit(page); });

  test('light mode gives a white call screen and dark mode a black one, with a green live dot and a red End', async ({page}) => {
    for (const theme of ['light', 'dark'] as const) {
      await page.goto(`/?fixture=1&mode=dev&start=phone:call&theme=${theme}`);
      const card = page.locator('[data-alpha-call-card]');
      await expect(card).toBeVisible();
      await expect(card.locator('.pn-head .alpha-live-dot')).toBeVisible();
      const colors = await card.evaluate(element => {
        const style = getComputedStyle(element), name = element.querySelector('.pn-head .serif')!, end = element.querySelector('[data-alpha-call-end]')!;
        return {bg: style.backgroundColor, fg: getComputedStyle(name).color, end: getComputedStyle(end).backgroundColor, dot: getComputedStyle(element.querySelector('.alpha-live-dot')!).backgroundColor};
      });
      expect(colors.bg, theme).toBe(theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)');
      expect(contrast(colors.fg, colors.bg), `${theme} name contrast`).toBeGreaterThanOrEqual(4.5);
      expect(colors.end).toBe('rgb(229, 56, 59)');
      expect(colors.dot).toBe('rgb(30, 158, 74)');
      // Mute, keypad, speaker and hold, in that order, then End (AC-03).
      expect(await card.locator('[data-alpha-stage-last] button').evaluateAll(buttons => buttons.map(b => b.getAttribute('aria-label')))).toEqual(['Mute', 'Show keypad', 'Speaker', 'Hold', 'End call']);
    }
  });

  test('End hit-tests at closed, open, full and mid-drag, and is the right-most call control while open', async ({page}) => {
    await page.goto('/?fixture=1&mode=dev&start=phone:call');
    await expect(page.locator('[data-alpha-call-card]')).toBeVisible();
    expect(await hits(page, '[data-alpha-bar-end]'), 'closed: End beside the bar').toBe(true);
    await openAlpha(page);
    await expect(page.locator('[data-alpha-layer="app"][data-alpha-stage="true"]')).toBeVisible();
    // The stage shows as the sheet starts rising (420ms height transition, AC-04); hit-test and
    // grab the sheet once it rests, or the press lands below a grabber still moving up.
    await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.timeline instanceof DocumentTimeline && a.effect?.getComputedTiming().endTime !== Infinity).map(a => a.finished.catch(() => {}))));
    expect(await hits(page, '[data-alpha-call-end]'), 'open: End in the call card').toBe(true);
    const order = await page.locator('[data-alpha-call-card] [data-alpha-stage-last]').evaluate(row => {
      const boxes = [...row.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width).map(b => ({end: b.hasAttribute('data-alpha-call-end'), x: b.getBoundingClientRect().left}));
      return boxes.sort((a, b) => a.x - b.x).at(-1)?.end;
    });
    expect(order, 'End is right-most').toBe(true);
    const grabber = page.getByRole('button', {name: 'Resize chat', exact: true});
    const box = (await grabber.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y - 60, {steps: 4});
    expect(await hits(page, '[data-alpha-call-end]'), 'mid-drag').toBe(true);
    await page.mouse.move(box.x + box.width / 2, 40, {steps: 6});
    await page.mouse.up();
    await expect(page.locator('[data-alpha-strip]')).toBeVisible();
    expect(await hits(page, '[data-alpha-strip-action="end"]'), 'full: End in the strip').toBe(true);
  });

  test('Alpha proposes a call and nothing dials before the tap on Call; Back returns to the thread, then closes the chat', async ({page}) => {
    await page.goto('/?fixture=1&mode=dev&start=messages:thread');
    await openAlpha(page);
    const before = (await recents(page)).length;
    await askAlpha(page, 'can you call maya');
    const proposal = page.locator('[data-alpha-chat-proposal]');
    await expect(proposal).toContainText('(415) 555-0132');
    await page.waitForTimeout(600);
    await expect(page.locator('[data-alpha-call-card]')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).alphaShell().vget('phone').callWho)).toBeNull();
    const sheet = await page.evaluate(() => getComputedStyle(document.querySelector('[data-screen]')!).getPropertyValue('--alpha-sheet-height'));
    await proposal.locator('[data-alpha-proposal-act]').click();
    await expect(page.locator('[data-alpha-call-card]')).toBeVisible();
    await expect(page.locator('[data-alpha-stage-return]')).toContainText('Messages');
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('[data-screen]')!).getPropertyValue('--alpha-sheet-height'))).toBe(sheet);
    await page.evaluate(() => (window as any).alphaShell().back());
    await expect(page.locator('[data-alpha-call-card]')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).alphaShell().S())).toMatchObject({view: 'messages', chat: 'sheet'});
    await page.evaluate(() => (window as any).alphaShell().back());
    expect(await page.evaluate(() => (window as any).alphaShell().S().chat)).toBe('input');
    expect((await recents(page)).length).toBe(before);
  });

  test('a ring over the open chat stages the incoming card; Answer and Decline are reachable at every height and Decline restores the stage', async ({page}) => {
    await page.goto('/?fixture=1&mode=dev&start=messages:thread');
    await openAlpha(page);
    await page.evaluate(() => { const shell = (window as any).alphaShell(); shell.mod('phone').actions.ring({args: {pid: 'maya'}}, shell.api(shell.S().view)); });
    await expect(page.locator('[data-alpha-incoming-card]')).toBeVisible();
    expect(await page.evaluate(() => (window as any).alphaShell().S().chat)).toBe('sheet');
    // The stage slides the incoming card in (AC-05); hit-test once it has landed.
    await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.timeline instanceof DocumentTimeline && a.effect?.getComputedTiming().endTime !== Infinity).map(a => a.finished.catch(() => {}))));
    for (const marker of ['[data-alpha-incoming-answer]', '[data-alpha-incoming-decline]']) expect(await hits(page, marker), `open ${marker}`).toBe(true);
    await page.evaluate(() => (window as any).alphaShell().setState({chat: 'full'}));
    for (const action of ['answer', 'decline']) await expect(page.locator(`[data-alpha-strip-action="${action}"]`)).toBeVisible();
    await page.evaluate(() => (window as any).alphaShell().setState({chat: 'sheet'}));
    await page.locator('[data-alpha-incoming-decline]').click();
    await expect(page.locator('[data-alpha-incoming-card]')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).alphaShell().S())).toMatchObject({view: 'messages', chat: 'sheet'});
  });

  test('a ring over a live call keeps that call\'s End reachable at every height (AC-18)', async ({page}) => {
    await page.goto('/?fixture=1&mode=dev&start=phone:keypad');
    for (const key of ['5', '5', '5', '0', '1', '0', '0']) await page.getByRole('button', {name: key, exact: true}).click();
    await page.getByRole('button', {name: 'Call', exact: true}).click();
    await expect(page.locator('[data-alpha-call-card]')).toBeVisible();
    await page.evaluate(() => { const shell = (window as any).alphaShell(); shell.mod('phone').actions.ring({args: {pid: 'maya'}}, shell.api('phone')); });
    await expect(page.locator('[data-alpha-incoming-card]')).toBeVisible();
    for (const chat of ['input', 'sheet', 'full']) {
      await page.evaluate(chat => (window as any).alphaShell().setState({chat}), chat);
      await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.timeline instanceof DocumentTimeline && a.effect?.getComputedTiming().endTime !== Infinity).map(a => a.finished.catch(() => {}))));
      const end = chat === 'full' ? '[data-alpha-strip-action="end"]' : chat === 'input' ? '[data-alpha-bar-end]' : '[data-alpha-ring-end]';
      expect(await hits(page, end), `${chat} ${end}`).toBe(true);
    }
    await page.locator('[data-alpha-strip-action="end"]').click();
    expect(await page.evaluate(() => (window as any).alphaShell().vget('phone').callWho)).toBeNull();
    await expect(page.locator('[data-alpha-incoming-card]')).toBeVisible();
  });

  test('the ongoing-call bar\'s text meets 4.5:1 (AC-28)', async ({page}) => {
    await page.goto('/?fixture=1&mode=dev&start=phone:keypad');
    for (const key of ['5', '5', '5']) await page.getByRole('button', {name: key, exact: true}).click();
    await page.getByRole('button', {name: 'Call', exact: true}).click();
    await page.evaluate(() => (window as any).alphaShell().goHome());
    await expect(page.getByRole('button', {name: /^Return to call, /})).toBeVisible();
    const ratio = await page.getByRole('region', {name: 'Ongoing call'}).evaluate(el => {
      const rgb = (v: string) => (v.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      const lum = ([r, g, b]: number[]) => [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      const style = getComputedStyle(el), [a, b] = [lum(rgb(style.color)), lum(rgb(style.backgroundColor))];
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    });
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  test('an emergency number keeps the full-screen call: no proposal, no stage, End reachable', async ({page}) => {
    await page.goto('/?fixture=1&mode=dev&start=phone:keypad');
    for (const key of ['9', '1', '1']) await page.getByRole('button', {name: key, exact: true}).click();
    await page.getByRole('button', {name: 'Call', exact: true}).click();
    const card = page.locator('[data-alpha-call-card]');
    await expect(card).toHaveAttribute('data-emergency', 'true');
    await openAlpha(page);
    await expect(page.locator('[data-alpha-layer="app"][data-alpha-stage="true"]')).toHaveCount(0);
    expect(await hits(page, '[data-alpha-call-end]')).toBe(true);
    await askAlpha(page, 'can you call maya');
    // Wait for the reply itself: the dropped proposal is answered with a plain line.
    await expect(page.locator('[data-alpha-layer="conversation"]').getByText('Not during an emergency call.', {exact: true})).toBeVisible();
    await expect(page.locator('[data-alpha-chat-proposal]')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).alphaShell().S().msgs.filter((m: any) => m.card?.type === 'proposal').length)).toBe(0);
    // The call is still live and End still reachable.
    await expect(card).toHaveAttribute('data-emergency', 'true');
    expect(await hits(page, '[data-alpha-call-end]')).toBe(true);
    // Call from a thread header and from a contact card: refused once each, before anything is drawn.
    await page.evaluate(() => { const w = window as any, shell = w.alphaShell(); w.toasts = []; const toast = shell.toast; shell.toast = function (text: string, ...rest: unknown[]) { w.toasts.push(text); return toast.call(this, text, ...rest); }; });
    await page.evaluate(() => (window as any).alphaShell().api('messages').open('phone', {call: 'maya'}));
    await page.evaluate(() => (window as any).alphaShell().api('contacts').open('phone', {call: 'maya', ret: {view: 'contacts', patch: {open: 'maya'}}}));
    await page.waitForTimeout(2000);
    expect(await page.evaluate(() => (window as any).toasts)).toEqual(['End the emergency call first', 'End the emergency call first']);
    expect(await page.evaluate(() => { const st = (window as any).alphaShell().vget('phone'); return [st.call, st.num, st.callWho]; })).toEqual([null, '911', '#911']);
    await expect(card).toHaveAttribute('data-emergency', 'true');
    // A write that bypasses the refusal (as a development jump can) still draws the emergency call.
    await page.evaluate(() => (window as any).alphaShell().vset('phone', {call: 'maya', num: ''}));
    await expect(card).toHaveAttribute('aria-label', 'Call with 911');
    await expect(card).toHaveAttribute('data-emergency', 'true');
    // Only End ends it: free text asking to hang up, or not to, ends nothing (AC-19).
    for (const text of ['hang up', "don't hang up"]) {
      await askAlpha(page, text);
      await page.waitForTimeout(2500);
      expect(await page.evaluate(() => (window as any).alphaShell().vget('phone').callWho)).toBe('#911');
    }
    // A ring over the emergency call: no compaction or strip replaces it, and declining or
    // screening it leaves the emergency call's clock running.
    await page.evaluate(() => { const shell = (window as any).alphaShell(); shell.mod('phone').actions.ring({args: {pid: 'maya'}}, shell.api('phone')); });
    await expect(page.locator('[data-alpha-incoming-card]')).toBeVisible();
    await page.evaluate(() => (window as any).alphaShell().setState({chat: 'full'}));
    await expect.poll(() => page.evaluate(() => (window as any).alphaShell().S().chat)).toBe('sheet');
    await expect(page.locator('[data-alpha-layer="app"][data-alpha-stage="true"]')).toHaveCount(0);
    await page.evaluate(() => (window as any).alphaShell().mod('phone').actions.screenIncoming({args: {ring: (window as any).alphaShell().vget('phone').ringId}}, (window as any).alphaShell().api('phone')));
    await page.locator('[data-alpha-incoming-decline]').click();
    await expect(page.locator('[data-alpha-incoming-card]')).toHaveCount(0);
    const tick = await page.evaluate(() => (window as any).alphaShell().vget('phone').tick);
    await expect.poll(() => page.evaluate(() => (window as any).alphaShell().vget('phone').tick), {timeout: 5000}).toBeGreaterThan(tick);
    expect(await page.evaluate(() => (window as any).alphaShell().vget('phone').callWho)).toBe('#911');
    // End ends the emergency call and logs it as 911, not as the refused contact.
    await page.locator('[data-alpha-call-end]').click();
    expect(await page.evaluate(() => { const r = (window as any).alphaShell().vget('phone').recents[0]; return [r.pid, r.num]; })).toEqual([null, '911']);
  });
});

test.describe('fixture dev build (?fixture=1&mode=dev, ELIZA_DEV_ALLOW_TEST_MOCKS=1): Recents filter', () => {
  test.beforeEach(async ({page}) => { await shellInit(page); });

  test('"Call or ask" filters Recents by name and by digits with no network request; an Alpha filter shows a clearable chip', async ({page}) => {
    await page.goto('/?fixture=1&mode=dev&start=phone');
    const external: string[] = [];
    page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:')) external.push(request.url()); });
    const field = page.locator('[data-alpha-bar-field="filter"]');
    await expect(field).toHaveAttribute('placeholder', 'Call or ask');
    await field.fill('maya');
    await expect(page.getByRole('button', {name: /^Call / }).filter({hasNotText: 'Maya'})).toHaveCount(0);
    await field.fill('555-0187');
    await expect(page.getByRole('button', {name: 'Call Jordan Park', exact: true}).first()).toBeVisible();
    await expect(page.getByRole('button', {name: 'Call Maya Chen', exact: true})).toHaveCount(0);
    expect(external).toEqual([]);
    await field.fill('');
    await field.fill('did maya call me');
    await field.press('Enter');
    const chip = page.locator('[data-alpha-list-filter-chip]');
    await expect(chip).toContainText('Maya Chen');
    await chip.getByRole('button', {name: 'Clear filter Maya Chen'}).click();
    await expect(chip).toHaveCount(0);
  });
});

test.describe('Alpha image shape (telephony-fixture.ts): Recents filter', () => {
  test('typing in "Call or ask" filters the image Recents locally and reads nothing more', async ({page}) => {
    await setupTelephony(page);
    await page.getByRole('button', {name: 'Phone', exact: true}).first().click();
    await expect(page.getByRole('button', {name: /^Call Carmen Ruiz/})).toBeVisible();
    const reads = await page.evaluate(() => ((window as any).telephonyInputs as [string, any][]).length);
    await page.locator('[data-alpha-bar-field="filter"]').fill('carm');
    await expect(page.locator('[data-alpha-phone-recents] button[aria-label^="Call "]')).toHaveCount(1);
    await page.locator('[data-alpha-bar-field="filter"]').fill('');
    await expect(page.getByRole('button', {name: /^Unknown, missed/})).toBeVisible();
    expect(await page.evaluate(() => ((window as any).telephonyInputs as [string, any][]).filter(row => row[0] === 'listRecentCalls').length)).toBeLessThanOrEqual(reads);
  });
});

test.describe('Alpha image shape (telephony-fixture.ts): AC-20 call card lookup', () => {
  test('the image resolver names the person by the number, counts the review\'s options, and claims nothing it did not read', async ({page}) => {
    // 150 contacts sort ahead of Carmen: a first-page scan of 100 could not find her.
    await setupTelephony(page, {padContacts: 150});
    await page.getByRole('button', {name: 'Phone', exact: true}).first().click();
    const resolve = (target: unknown) => page.evaluate(async target => {
      const {resolveCallParty, callCardText} = await import('/src/runtime/comms-bar.ts' as string);
      const party = await resolveCallParty(target);
      return {party, card: callCardText(target, party, (n: string) => n)};
    }, target);
    // By Android's own number matching, not the first page of the address book.
    const lookups = () => page.evaluate(() => ((window as any).telephonyInputs as [string, any][]).filter(([method]) => method === 'contactForNumber' || method === 'searchContacts').map(([method, input]) => [method, input.number ?? input.query]));
    const before = (await lookups()).length;
    expect(await resolve({number: '(555) 010-0103'})).toEqual({party: {name: 'Carmen Ruiz', numbers: ['(555) 010-0103']}, card: {title: 'Call Carmen Ruiz', detail: '(555) 010-0103'}});
    // The number goes to Android's lookup; no address-book page is scanned for it.
    expect((await lookups()).slice(before)).toEqual([['contactForNumber', '(555) 010-0103']]);
    expect((await resolve({number: '+15559990000'})).card.detail).toBe('+15559990000 · not in Contacts');
    // An unparseable number names nobody and says nothing about Contacts.
    expect(await resolve({number: '1-800-FLOWERS'})).toEqual({party: null, card: {title: 'Call 1-800-FLOWERS', detail: '1-800-FLOWERS'}});
    // A contact: the same normalised options the in-card review offers before the dial.
    expect((await resolve({contact: 'Bao'})).card).toEqual({title: 'Call Bao Tran', detail: '2 numbers · you choose one before it dials'});
    // Without Contacts access nothing is claimed.
    await page.evaluate(() => { (window as any).access.contacts = false; });
    expect((await resolve({number: '+15559990000'})).card.detail).toBe('+15559990000');
  });
});
