import { test, expect } from '@playwright/test';
// Development lane: the browser DeviceApps implementation stands in for Android's installed-app
// plugin. Its "apps" mirror Alpha views, which live on Home, so Apps lists no installed apps here.
// Installed-app behaviour is covered with a native stub (home-app-library, home-native-launcher)
// and on Android by LauncherHomeInstrumentedTest.

test('Apps opens over Home without product views or a count, and closes on Back, Home and Close', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Apps', exact: true });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('heading', { name: 'Apps', exact: true })).toBeVisible();
  await expect(drawer.getByText('No apps', { exact: true })).toBeVisible();
  // Product views are on Home only; the drawer has no count and no reorder or favorite controls.
  await expect(drawer.getByRole('button', { name: /^Open / })).toHaveCount(0);
  await expect(drawer.getByText(/\d+ apps?$/)).toHaveCount(0);
  await expect(drawer.getByRole('button', { name: /favorites|earlier|later/ })).toHaveCount(0);
  // Home behind the drawer is not reachable by touch or assistive technology.
  await expect(page.locator('[data-alpha-layer="home"]')).toHaveAttribute('aria-hidden', 'true');
  // The browser has no default dialer to resolve, so no Phone shortcut is offered.
  await expect(drawer.getByRole('button', { name: /^Open Phone/ })).toHaveCount(0);
  await drawer.getByRole('searchbox', { name: 'Search apps', exact: true }).fill('cal');
  await expect(drawer.getByText('No apps', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('drawer-empty.png') });

  // Home returns to Home.
  await page.evaluate(() => window.dispatchEvent(new Event('launcher-home')));
  await expect(page.locator('html')).toHaveAttribute('data-active-view', 'home');
  await expect(drawer).toHaveCount(0);
  // Back closes an open drawer and keeps Home.
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  await expect(drawer).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('alpha-back', { cancelable: true })));
  await expect(drawer).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
  // The explicit close control also works.
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  await drawer.getByRole('button', { name: 'Close apps', exact: true }).click();
  await expect(drawer).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a failed installed-app read shows one line with a manual retry', async ({ page }) => {
  await page.goto('/');
  // Fail only the next list() call of the browser device implementation behind DeviceApps.
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
  // Alpha's own views stay on Home throughout.
  await drawer.getByRole('button', { name: 'Close apps', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Calendar', exact: true })).toBeVisible();
});
