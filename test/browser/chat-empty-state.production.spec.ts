import { test, expect } from '@playwright/test';
// Flag-off production web bundle: the web app has no agent of its own, so an empty chat says the
// agent is used on the phone before anything is sent (VIS-13).
//
// Evidence boundary: source/test evidence for the web renderer only; the resident Android build
// states availability in the composer's draft status instead and is not exercised here.

test('an empty chat on the web says the agent is used on the phone', async ({ page }) => {
  const foreign: string[] = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    foreign.push(`${route.request().method()} ${url.origin}${url.pathname}`); return route.abort();
  });
  await page.addInitScript(() => localStorage.setItem('alpha.connection.selection.v1', JSON.stringify({ kind: 'offline' })));
  await page.goto('/');
  await page.getByRole('button', { name: 'Open conversation', exact: true }).click();
  const empty = page.locator('[data-alpha-transcript] [data-alpha-chat-empty]');
  await expect(empty).toHaveText('Use on phone');
  await expect(empty).toHaveAttribute('role', 'status');
  expect(foreign).toEqual([]);
});
