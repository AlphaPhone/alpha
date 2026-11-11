// Flag-off Android renderer (the APK path), first run: a phone with no Cloud sign-in shows the
// sign-in page at once and takes an email and its code while the agent is still starting; the new
// key binds when the agent is ready. A phone that already holds a sign-in, or uses its own keys,
// never shows the sign-in page while its agent starts. The agent start is held by the synthetic
// native bridge for as long as each check needs. No device, Steward, Eliza Cloud or agent is real,
// and no timing here is a measurement of a phone.
import { test, expect, type Page } from '@playwright/test';
import { flagOffAndroid, fenceNetwork } from './flag-off-android';
import { residentStub, stub, setStub, type StubAccount } from './resident-stub';

const account: StubAccount = { token: 'beside-start-key', userId: '9f1dc45a-4011-4e44-947a-30d999d24fa5', email: 'owner@example.invalid', balance: 5 };
const count = (page: Page, entry: string) => stub(page, s => s.order) .then((order: string[]) => order.filter(row => row === entry).length);
const waiting = (page: Page) => stub(page, s => s.startWaiting === true) as Promise<boolean>;
const signInPage = (page: Page) => page.locator('[role="main"].alpha-cloud-sign-in');

test('a signed-out phone signs in while its agent is still starting, and the key binds when the agent is ready', async ({ page }) => {
  test.setTimeout(90_000);
  const foreign = await fenceNetwork(page);
  await flagOffAndroid(page, { freshAccess: true });
  await residentStub(page, { nativeSignIn: true, emptyKeystore: true, holdFirstStart: true, accounts: [account] });
  await page.goto('/');
  await setStub(page, { nextToken: account.token });
  const welcome = signInPage(page);
  // The agent has been asked to start and has not answered; the page does not wait for it.
  await expect.poll(() => waiting(page), { timeout: 30_000 }).toBe(true);
  const email = welcome.getByRole('textbox', { name: 'Email', exact: true });
  await expect(email).toBeEnabled({ timeout: 15_000 });
  expect(await waiting(page)).toBe(true);
  await expect(welcome.getByRole('button', { name: 'Send code', exact: true })).toBeEnabled();
  await email.fill(account.email);
  await welcome.getByRole('button', { name: 'Send code', exact: true }).click();
  const code = welcome.getByLabel('Code', { exact: true });
  await expect(code).toBeVisible();
  expect(await waiting(page)).toBe(true);
  await code.fill('123456');
  await welcome.getByRole('button', { name: 'Verify', exact: true }).click();
  // The code is verified and its key stored. Binding waits for the agent: nothing restarts it early.
  await expect.poll(() => stub(page, s => s.order.includes('store beside-start-key')), { timeout: 15_000 }).toBe(true);
  await expect(welcome.getByRole('button', { name: 'Signing in', exact: true })).toBeDisabled();
  expect(await count(page, 'Agent.start')).toBe(1);
  expect(await stub(page, s => s.order.some((entry: string) => entry.startsWith('configureCloudProvider')))).toBe(false);
  await expect(page.getByText('Local agent failed to start.', { exact: true })).toHaveCount(0);
  // The agent is ready: the key binds and the agent restarts with it, behind the access steps.
  await page.evaluate(() => (window as any).residentStub.releaseStart());
  await expect.poll(() => stub(page, s => s.order.some((entry: string) => entry.startsWith('configureCloudProvider'))), { timeout: 30_000 }).toBe(true);
  await expect(page.locator('dialog.alpha-startup-permissions').getByRole('heading', { name: 'Access', exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(welcome).toHaveCount(0);
  await expect.poll(() => count(page, 'Agent.start'), { timeout: 30_000 }).toBe(2);
  const order: string[] = await stub(page, s => s.order);
  expect(order.indexOf('store beside-start-key')).toBeLessThan(order.findIndex(entry => entry.startsWith('configureCloudProvider')));
  expect(foreign).toEqual([]);
});

test('a phone that already holds a sign-in never shows the sign-in page while its agent starts', async ({ page }) => {
  test.setTimeout(60_000);
  const foreign = await fenceNetwork(page);
  await flagOffAndroid(page);
  await residentStub(page, { nativeSignIn: true, holdFirstStart: true, accounts: [account] });
  // Every frame from the first paint: a flash of the page would be recorded here.
  await page.addInitScript(() => {
    const w = window as any; w.signInSeen = 0;
    const look = () => { if (document.querySelector('.alpha-cloud-sign-in')) w.signInSeen++; requestAnimationFrame(look); };
    requestAnimationFrame(look);
  });
  await page.goto('/');
  await expect.poll(() => waiting(page), { timeout: 30_000 }).toBe(true);
  // Held well past the readiness check a signed-out phone would have started by now.
  await page.waitForTimeout(2_500);
  await expect(signInPage(page)).toHaveCount(0);
  // The page's readiness check was never made: sign-in was not asked for.
  expect(await stub(page, s => s.order.filter((entry: string) => entry.startsWith('native sign-in') && !entry.endsWith('Listener')))).toEqual([]);
  await page.evaluate(() => (window as any).residentStub.releaseStart());
  await expect(page.getByRole('region', { name: 'Home', exact: true })).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1_000);
  expect(await count(page, 'Agent.start')).toBe(1);
  expect(await page.evaluate(() => (window as any).signInSeen)).toBe(0);
  expect(foreign).toEqual([]);
});

test('an error the owner is reading on the code step stays when the agent finishes starting', async ({ page }) => {
  test.setTimeout(60_000);
  const foreign = await fenceNetwork(page);
  await flagOffAndroid(page, { freshAccess: true });
  await residentStub(page, { nativeSignIn: true, emptyKeystore: true, holdFirstStart: true, accounts: [account] });
  await page.goto('/');
  const welcome = signInPage(page);
  await expect.poll(() => waiting(page), { timeout: 30_000 }).toBe(true);
  await welcome.getByRole('textbox', { name: 'Email', exact: true }).fill(account.email);
  await welcome.getByRole('button', { name: 'Send code', exact: true }).click();
  const code = welcome.getByLabel('Code', { exact: true });
  await code.fill('654321');
  await welcome.getByRole('button', { name: 'Verify', exact: true }).click();
  const refused = welcome.getByRole('alert');
  await expect(refused).toBeVisible();
  const text = await refused.innerText();
  expect(await waiting(page)).toBe(true);
  // The agent becomes ready while the refusal is on screen: the step, its code and its error stay.
  await page.evaluate(() => (window as any).residentStub.releaseStart());
  await expect.poll(() => waiting(page)).toBe(false);
  await page.waitForTimeout(1_500);
  await expect(refused).toHaveText(text);
  await expect(code).toBeVisible();
  await expect(code).toBeEnabled();
  await expect(page.getByText('Connected', { exact: true })).toHaveCount(0);
  expect(await count(page, 'Agent.start')).toBe(1);
  expect(foreign).toEqual([]);
});
