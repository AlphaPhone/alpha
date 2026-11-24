import { test, expect } from '@playwright/test';

test('the web Browser menu offers no Find in page and shows no "not implemented" toast', async ({ page }) => {
  const foreign: string[] = [], toasts: string[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    if (url.origin === 'https://find-fixture.test') return route.fulfill({ contentType: 'text/html', body: '<h1>Find fixture</h1><p>Searchable harbour words.</p>' });
    foreign.push(`${route.request().method()} ${url.origin}${url.pathname}`); return route.abort();
  });
  await page.addInitScript(() => { if (window === window.top) localStorage.setItem('alpha.connection.selection.v1', JSON.stringify({ kind: 'offline' })); });
  await page.goto('/');
  await page.evaluate(() => {
    const region = document.querySelector('[data-alpha-toast]');
    if (region) new MutationObserver(() => { const text = region.textContent || ''; if (text) ((window as any).toasts ??= []).push(text); }).observe(region, { childList: true, subtree: true, characterData: true });
  });
  await page.getByRole('button', { name: 'Browser', exact: true }).click();
  await page.getByRole('button', { name: 'Search or type address', exact: true }).click();
  await page.getByRole('textbox', { name: 'Address', exact: true }).fill('https://find-fixture.test/page');
  await page.getByRole('textbox', { name: 'Address', exact: true }).press('Enter');
  await expect(page.frameLocator('iframe[title="Website"]').getByRole('heading', { name: 'Find fixture' })).toBeVisible();

  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  const menu = page.getByRole('dialog', { name: 'Browser menu', exact: true });
  await expect(menu.getByRole('button', { name: 'Reload page', exact: true })).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Find in page', exact: true })).toHaveCount(0);
  await expect(page.getByRole('search', { name: 'Find in page' })).toHaveCount(0);
  await menu.getByRole('button', { name: 'Reload page', exact: true }).click();
  await expect(page.frameLocator('iframe[title="Website"]').getByRole('heading', { name: 'Find fixture' })).toBeVisible();
  await page.waitForTimeout(300);
  toasts.push(...await page.evaluate(() => (window as any).toasts ?? []));
  expect(toasts.filter(text => /not implemented|unimplemented/i.test(text))).toEqual([]);
  await expect(page.getByText(/not implemented/i)).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(foreign).toEqual([]);
});
