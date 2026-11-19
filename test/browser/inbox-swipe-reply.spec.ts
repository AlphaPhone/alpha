// PROD-03: on the local Inbox, swiping a received message to the right used to ask for a reply
// draft that the agent adapter can only refuse ("Not available yet. Nothing was sent."). With no
// way to draft one, the swipe does nothing; swiping left still archives.
//
// Evidence boundary: the development renderer's local mailbox (model.js rows), not Gmail or a device.
import {test, expect, type Page} from '@playwright/test';

const toasts = (page: Page) => page.evaluate(() => (window as any).__toasts.splice(0) as string[]);
async function swipe(page: Page, row: ReturnType<Page['locator']>, dx: number) {
  const box = (await row.boundingBox())!;
  // Start clear of the edge gesture zones and end inside the row, so the row sees both ends.
  const y = box.y + box.height / 2, x = box.x + (dx > 0 ? 0.25 : 0.75) * box.width;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y, {steps: 6}); await page.mouse.up();
}

test('swiping a local Inbox message right offers no reply it cannot draft', async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('alpha.connection.selection.v1', JSON.stringify({kind: 'offline'})));
  await page.goto('/?mode=dev');
  await page.getByRole('button', {name: 'Inbox', exact: true}).click();
  await page.evaluate(() => {
    const screen = document.querySelector('[data-screen]') as any, key = Object.keys(screen).find(name => name.startsWith('__reactFiber$'))!;
    let fiber = screen[key];
    while (fiber && !(fiber.stateNode && typeof fiber.stateNode.S === 'function' && typeof fiber.stateNode.toast === 'function')) fiber = fiber.return;
    const shell = fiber.stateNode, toast = shell.toast, seen: string[] = (window as any).__toasts = [];
    shell.toast = function (message: unknown, ...rest: unknown[]) { seen.push(String(message)); return toast.call(this, message, ...rest); };
  });
  const list = page.locator('[data-alpha-subview="inbox-list"]');
  const row = list.getByRole('button').filter({hasText: /\S/}).filter({has: page.locator('.mail-sender-avatar')}).first();
  await expect(row).toBeVisible();
  const name = await row.getAttribute('aria-label');
  const before = await list.locator('.mail-sender-avatar').count();
  await swipe(page, row, 200);
  await page.waitForTimeout(600);
  expect(await toasts(page)).toEqual([]);
  await expect(page.getByText(/Here's a reply to/)).toHaveCount(0);
  await expect(list.getByRole('button', {name: name!, exact: true})).toBeVisible();
  // Swiping left still archives the message.
  await swipe(page, list.getByRole('button', {name: name!, exact: true}), -200);
  await expect.poll(() => toasts(page).then(seen => seen.some(text => text.endsWith('archived')))).toBe(true);
  await expect(list.locator('.mail-sender-avatar')).toHaveCount(before - 1);
});
