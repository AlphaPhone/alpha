import { test, expect } from '@playwright/test';

test('Apps opens over Home without product views or a count, and closes on Back, Home and Close', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Apps', exact: true });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('heading', { name: 'Apps', exact: true })).toBeVisible();
  await expect(drawer.getByText('No apps', { exact: true })).toBeVisible();
  await expect(drawer.getByRole('button', { name: /^Open / })).toHaveCount(0);
  await expect(drawer.getByText(/\d+ apps?$/)).toHaveCount(0);
  await expect(drawer.getByRole('button', { name: /favorites|earlier|later/ })).toHaveCount(0);
  await expect(page.locator('[data-alpha-layer="home"]')).toHaveAttribute('aria-hidden', 'true');
  await expect(drawer.getByRole('button', { name: /^Open Phone/ })).toHaveCount(0);
  await drawer.getByRole('searchbox', { name: 'Search apps', exact: true }).fill('cal');
  await expect(drawer.getByText('No apps', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('drawer-empty.png') });

  await page.evaluate(() => window.dispatchEvent(new Event('launcher-home')));
  await expect(page.locator('html')).toHaveAttribute('data-active-view', 'home');
  await expect(drawer).toHaveCount(0);
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  await expect(drawer).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('alpha-back', { cancelable: true })));
  await expect(drawer).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  await drawer.getByRole('button', { name: 'Close apps', exact: true }).click();
  await expect(drawer).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a failed installed-app read shows one line with a manual retry', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const { BrowserDevice } = await import('/src/browser/device.ts');
    const proto = BrowserDevice.prototype as any, original = proto.list;
    let failed = false;
    proto.list = function (...args: any[]) { if (!failed) { failed = true; return Promise.reject(Error('Package manager unavailable')); } return original.apply(this, args); };
  });
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Apps', exact: true });
  await expect(drawer.getByText('Apps could not be read.', { exact: true })).toBeVisible();
  await drawer.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(drawer.getByText('Apps could not be read.', { exact: true })).toHaveCount(0);
  await expect(drawer.getByText('No apps', { exact: true })).toBeVisible();
  await drawer.getByRole('button', { name: 'Close apps', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Calendar', exact: true })).toBeVisible();
});

test('an upgraded install keeps its Home favorites saved under older view ids', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    if (sessionStorage.getItem('upgrade.seeded')) return;
    sessionStorage.setItem('upgrade.seeded', '1');
    localStorage.setItem('alpha.launcher.favorites.v1', JSON.stringify({ version: 2, keys: ['alpha:workflows', 'alpha:notes', 'alpha:workflows'], defaultPolicy: 'alpha-apps' }));
  });
  await page.goto('/');
  const home = page.locator('[data-alpha-home-apps]');
  await expect(home.getByRole('button', { name: 'Apps', exact: true })).toBeVisible();
  const tiles = () => home.locator('[data-mobile-shell-tile]').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label')));
  await expect.poll(tiles).toEqual(['Workflows', 'Notes', 'Apps']);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('alpha.launcher.favorites.v1') || 'null'))).toEqual({ version: 2, keys: ['alpha:automations', 'alpha:notes'], defaultPolicy: 'alpha-apps' });
  await home.getByRole('button', { name: 'Workflows', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-active-view', 'workflows');
  await page.evaluate(() => window.dispatchEvent(new Event('launcher-home')));
  await page.reload();
  await expect.poll(tiles).toEqual(['Workflows', 'Notes', 'Apps']);
  expect(errors).toEqual([]);
});

test('the product palette reaches the document root and dialogs outside the phone', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Apps', exact: true })).toBeVisible();
  const colours = await page.evaluate(() => {
    const button = document.createElement('button');
    button.className = 'content-question-primary';
    const dialog = document.createElement('div');
    dialog.className = 'note-source-dialog';
    dialog.append(button);
    document.body.append(dialog);
    const result = {
      root: getComputedStyle(document.documentElement).getPropertyValue('--alpha-white').trim(),
      body: getComputedStyle(document.body).backgroundColor,
      text: getComputedStyle(button).color,
    };
    dialog.remove();
    return result;
  });
  expect(colours).toEqual({ root: '#FFFFFF', body: 'rgb(255, 255, 255)', text: 'rgb(255, 255, 255)' });
});
