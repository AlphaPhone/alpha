import { test, expect, type Page } from '@playwright/test';
// The shell's toast lifetime (model.js toast): long enough to read, held while keyboard focus is
// inside it, dismissed by a tap. Android's "Time to take action" scale is 1 in a browser; the native
// setting is covered by test/accessibility-timeout.test.mjs and needs a device check.

/** The phone shell's own toast(), reached through the rendered tree: the call every adapter makes. */
const raise = (page: Page, message: string, undo = false) => page.evaluate(({ message, undo }) => {
  const screen = document.querySelector('[data-screen]') as any;
  const key = Object.keys(screen).find(name => name.startsWith('__reactFiber$'))!;
  let fiber = screen[key];
  while (fiber && !(fiber.stateNode && typeof fiber.stateNode.toast === 'function')) fiber = fiber.return;
  (window as any).__undone = 0;
  fiber.stateNode.toast(message, undo ? { undo: () => { (window as any).__undone++; ((window as any).__undoOrder ||= []).push(message); } } : undefined);
}, { message, undo });
const pill = (page: Page) => page.locator('[data-alpha-toast] .drop');

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => localStorage.setItem('alpha.connection.selection.v1', JSON.stringify({ kind: 'offline' })));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible({timeout:15_000});
  // The page's fake clock ran in real time through startup; it now stops, so a toast deadline moves
  // only when a test advances it with runFor. A 1.9 s toast cannot run out while a loaded machine is
  // still delivering the tap or key press, and each lifetime is checked just before and after its end.
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 2_000);
});

test('a long toast stays up for its reading time and a short one for 1.9 s', async ({ page }) => {
  await raise(page, 'A'.repeat(191));
  await page.clock.runFor(9_500);
  await expect(pill(page)).toBeVisible();
  await page.clock.runFor(2_500);
  await expect(pill(page)).toHaveCount(0);
  await raise(page, 'Saved');
  await page.clock.runFor(1_500);
  await expect(pill(page)).toBeVisible();
  await page.clock.runFor(1_500);
  await expect(pill(page)).toHaveCount(0);
});

test('a toast with Undo stays 10 s, the same window as the reviewed-deletion notice', async ({ page }) => {
  await raise(page, 'Deleted', true);
  await page.clock.runFor(9_500);
  await expect(pill(page).getByRole('button', { name: 'Undo', exact: true })).toBeVisible();
  await page.clock.runFor(2_000);
  await expect(pill(page)).toHaveCount(0);
});

test('passive notices keep the current Undo and show the latest notice afterward', async ({page}) => {
  await raise(page, 'First item deleted', true);
  await raise(page, 'Older passive notice');
  await raise(page, 'Latest passive notice');
  await expect(pill(page)).toContainText('First item deleted');
  await pill(page).getByRole('button', {name:'Undo', exact:true}).click();
  await expect(pill(page)).toContainText('Latest passive notice');
  expect(await page.evaluate(() => (window as any).__undoOrder)).toEqual(['First item deleted']);
  await expect(pill(page).getByRole('button', {name:'Undo', exact:true})).toHaveCount(0);
});

test('consecutive deletion notices retain both exact Undo callbacks', async ({page}) => {
  await raise(page, 'First item deleted', true);
  await raise(page, 'Second item deleted', true);
  await expect(pill(page)).toContainText('First item deleted');
  await pill(page).getByRole('button', {name:'Undo', exact:true}).click();
  await expect(pill(page)).toContainText('Second item deleted');
  await pill(page).getByRole('button', {name:'Undo', exact:true}).click();
  await expect(pill(page)).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__undoOrder)).toEqual(['First item deleted', 'Second item deleted']);
});

test('keyboard focus on Undo holds the toast, and focus returns when it ends', async ({ page }) => {
  const origin = page.getByRole('button', { name: 'Settings', exact: true });
  await origin.focus();
  await raise(page, 'Deleted', true);
  const undo = pill(page).getByRole('button', { name: 'Undo', exact: true });
  await undo.focus();
  await page.clock.runFor(11_500);
  await expect(undo).toBeVisible();
  await expect(undo).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(pill(page)).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__undone)).toBe(1);
  await expect(origin).toBeFocused();
  // Focus leaving the toast lets it run out again.
  await raise(page, 'Deleted', true);
  await undo.focus();
  await page.clock.runFor(10_500);
  await expect(undo).toBeVisible();
  await origin.focus();
  await page.clock.runFor(12_000);
  await expect(pill(page)).toHaveCount(0);
});

test('tapping a plain toast dismisses it', async ({ page }) => {
  await raise(page, 'A'.repeat(120));
  await expect(pill(page)).toBeVisible();
  await pill(page).click();
  await expect(pill(page)).toHaveCount(0);
});

test('a failure is announced assertively and a routine notice politely', async ({ page }) => {
  const region = page.locator('[data-alpha-toast]');
  await expect(region).toHaveAttribute('aria-live', 'polite');
  await page.evaluate(() => {
    const screen = document.querySelector('[data-screen]') as any;
    let fiber = screen[Object.keys(screen).find(name => name.startsWith('__reactFiber$'))!];
    while (fiber && !(fiber.stateNode && typeof fiber.stateNode.toast === 'function')) fiber = fiber.return;
    fiber.stateNode.toast('Couldn’t save. Try again.', { kind: 'error' });
  });
  await expect(pill(page)).toContainText('Couldn’t save. Try again.');
  await expect(region).toHaveAttribute('aria-live', 'assertive');
  await pill(page).click();
  await expect(region).toHaveAttribute('aria-live', 'polite');
  await raise(page, 'Saved');
  await expect(region).toHaveAttribute('aria-live', 'polite');
});

for (const key of ['Enter', 'Space']) {
  test(`a plain toast can be dismissed with ${key} and restores focus`, async ({page}) => {
    const origin=page.getByRole('button',{name:'Settings',exact:true});
    await origin.focus();
    await raise(page,'Calendar updated');
    const message=page.getByRole('button',{name:'Calendar updated',exact:true});
    await message.focus();
    await expect(message).toBeFocused();
    await page.keyboard.press(key);
    await expect(pill(page)).toHaveCount(0);
    await expect(origin).toBeFocused();
  });
}

/** toast() with an explicit kind, as the persistent-notice callers pass it. */
const raiseKind = (page: Page, message: string, kind: 'error' | 'persistent') => page.evaluate(({ message, kind }) => {
  const screen = document.querySelector('[data-screen]') as any;
  let fiber = screen[Object.keys(screen).find(name => name.startsWith('__reactFiber$'))!];
  while (fiber && !(fiber.stateNode && typeof fiber.stateNode.toast === 'function')) fiber = fiber.return;
  fiber.stateNode.toast(message, { kind });
}, { message, kind });

test('a new notice waits for the reading time of the one on screen instead of replacing it', async ({ page }) => {
  // A long passive notice would stay 10 s alone; with another waiting it yields after 1.9 s.
  await raise(page, 'A'.repeat(191));
  await raise(page, 'Note saved');
  await raise(page, 'Note saved');
  await expect(pill(page)).toContainText('AAAA');
  await page.clock.runFor(1_500);
  await expect(pill(page)).toContainText('AAAA');
  await page.clock.runFor(600);
  await expect(pill(page)).toContainText('Note saved');
  await page.clock.runFor(2_500);
  await expect(pill(page)).toHaveCount(0);
});

test('an Undo offer takes a passive notice\'s place at once', async ({ page }) => {
  await raise(page, 'Calendar updated');
  await raise(page, 'Deleted', true);
  await expect(pill(page)).toContainText('Deleted');
  await expect(pill(page).getByRole('button', { name: 'Undo', exact: true })).toBeVisible();
});

test('a persistent notice is announced once, then stays in the chat until Dismiss', async ({ page }) => {
  const lost = 'Your unsaved edit to “Trip” was lost when the agent connection changed.';
  const region = page.locator('[data-alpha-toast]'), listed = page.locator('[data-alpha-persistent-notice]');
  await raiseKind(page, lost, 'persistent');
  await expect(pill(page)).toContainText(lost);
  await expect(region).toHaveAttribute('aria-live', 'assertive');
  // Other feedback is not held back for long behind it, and both toasts end on their own.
  await raise(page, 'Saved');
  await page.clock.runFor(60_000);
  await expect(pill(page)).toHaveCount(0);
  // The notice is listed once, in the chat's notice area, in the page flow.
  await raiseKind(page, lost, 'persistent');
  await page.clock.runFor(60_000);
  await page.getByRole('button', { name: 'Open conversation', exact: true }).click();
  await expect(listed).toHaveCount(1);
  await expect(listed).toContainText(lost);
  expect(await listed.evaluate(element => getComputedStyle(element).position)).toBe('static');
  const dismiss = listed.getByRole('button', { name: 'Dismiss notice', exact: true });
  expect((await dismiss.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await dismiss.focus();
  await page.keyboard.press('Enter');
  await expect(listed).toHaveCount(0);
  // Focus does not fall to the page when its notice goes.
  await expect(page.locator('[data-alpha-chat-header] [data-alpha-chat-home]')).toBeFocused();
});
