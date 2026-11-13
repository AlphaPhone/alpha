// The first-run plan step on the flag-off Android renderer: a signed-in account without a plan
// chooses one of Cloud's published plans, pays on the provider's hosted page in the browser, and
// Alpha confirms the purchase with Cloud when the owner returns. Also the membership code entry
// from the same step.
//
// Evidence boundary: source/test evidence for the flag-off renderer only. The Capacitor bridge is
// the stub in flag-off-android.ts plus resident-stub.ts; Cloud's catalogue, checkout and confirm
// answers are synthetic copies of the pinned route shapes; the "payment page" is only the URL the
// stubbed openExternal records, never loaded; the billing return is the stub's
// AlphaConnection.consumeBillingReturn. No payment is made and no provider is contacted. It is not
// the native AlphaConnection plugin, Android App Link verification, Eliza Cloud, Stripe or a device.
import { test, expect, type Page } from '@playwright/test';
import { flagOffAndroid, harness, fenceNetwork, expectNoDevelopmentSurface, seedCompletedAccessSetup } from './flag-off-android';
import { residentStub, stub, setStub, billingReturn, STUB_CHECKOUT_PAGE, STUB_CHECKOUT_SESSION, type StubAccount } from './resident-stub';

const id = '9f1dc45a-4011-4e44-947a-30d999d24fa5';
const PENDING = 'alpha.connection.subscription-checkout.v1';
// Synthetic, never a real grant code: 16 Crockford characters once normalized.
const CODE = 'synt-hetc-0de0-0001';
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Account', exact: true });
const controls = (page: Page) => sheet(page).getByRole('region', { name: 'Balance and membership', exact: true });
const chooser = (page: Page) => controls(page).getByRole('region', { name: 'Choose a plan', exact: true });
const subscribe = (page: Page, plan = 'Plus') => chooser(page).getByRole('button', { name: `Subscribe to ${plan}`, exact: true });
const pending = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), PENDING);
const checkout = (page: Page) => stub(page, s => s.checkout) as Promise<{ started: Array<{ planKey: string; idempotencyKey: string; presentation: string; auth?: string }>; confirmed: string[] }>;
const configured = (page: Page) => stub(page, s => s.order.filter((entry: string) => entry.startsWith('configureCloudProvider')).length);

async function boot(page: Page, account: Partial<StubAccount> = {}, options: { checkout?: boolean; nativeSignIn?: boolean } = { checkout: true }) {
  const foreign = await fenceNetwork(page);
  await seedCompletedAccessSetup(page);
  await flagOffAndroid(page);
  await residentStub(page, { ...options, accounts: [{ token: 'synthetic-cloud-key', userId: id, email: 'owner@example.invalid', balance: 0, plan: 'credits', ...account }] });
  await page.goto('/');
  await expect.poll(() => harness(page, f => f.calls.includes('Agent.start')), { timeout: 30_000 }).toBe(true);
  return foreign;
}
/** A new account, signed in, with no plan: the plan step with Cloud's two published plans. */
async function planStep(page: Page, options: { nativeSignIn?: boolean } = {}) {
  const foreign = await boot(page, {}, { checkout: true, ...options });
  await expect(sheet(page)).toBeVisible({ timeout: 30_000 });
  await expect(subscribe(page)).toBeVisible({ timeout: 30_000 });
  return foreign;
}
/** Subscribe to Plus and reach the waiting state with the payment page handed to the browser. */
async function startCheckout(page: Page) {
  await subscribe(page).click();
  await expect(chooser(page).getByRole('button', { name: 'Check payment', exact: true })).toBeVisible({ timeout: 30_000 });
  expect(await stub(page, s => s.opened)).toEqual([STUB_CHECKOUT_PAGE]);
}
async function expectPlanActive(page: Page) {
  await expect(page.getByRole('region', { name: 'Choose a plan', exact: true })).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByRole('status').filter({ hasText: 'Plus active' }).first()).toBeVisible({ timeout: 30_000 });
  expect(await pending(page)).toBeNull();
}

test('success: one plan chooser with Subscribe and a code entry; the billing return confirms and binds Cloud', async ({ page }) => {
  test.setTimeout(120_000);
  const foreign = await planStep(page);
  // One chooser: Cloud's plans with their published prices, one Subscribe each, and the code entry.
  await expect(chooser(page).getByRole('listitem')).toHaveCount(2);
  await expect(chooser(page).getByRole('listitem').first()).toContainText('Plus');
  await expect(chooser(page).getByRole('listitem').first()).toContainText('$20 / month');
  await expect(subscribe(page, 'Pro')).toBeVisible();
  await expect(controls(page).getByRole('button', { name: 'I have a code', exact: true })).toBeVisible();
  await expect(controls(page).getByRole('button', { name: 'Choose a plan', exact: true })).toHaveCount(0);
  expect((await checkout(page)).started).toEqual([]);
  expect(await stub(page, s => s.opened)).toEqual([]);
  const before = await configured(page);

  await startCheckout(page);
  const { started } = await checkout(page);
  expect(started).toHaveLength(1);
  expect(started[0]).toMatchObject({ planKey: 'plus_monthly', presentation: 'mobile', auth: 'Bearer synthetic-cloud-key' });
  expect(started[0].idempotencyKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  // The purchase intent is durable and holds no credential.
  const record = await pending(page);
  expect(record).toMatchObject({ v: 1, planKey: 'plus_monthly', idempotencyKey: started[0].idempotencyKey, sessionId: STUB_CHECKOUT_SESSION, owner: { environment: 'production', userId: id } });
  expect(JSON.stringify(record)).not.toContain('synthetic-cloud-key');
  expect((await checkout(page)).confirmed).toEqual([]);

  await billingReturn(page, { result: 'success', sessionId: STUB_CHECKOUT_SESSION });
  await expectPlanActive(page);
  expect((await checkout(page)).confirmed).toEqual([STUB_CHECKOUT_SESSION]);
  // Cloud inference is bound for the account that now has a plan.
  await expect.poll(() => configured(page), { timeout: 30_000 }).toBeGreaterThan(before);
  expect((await checkout(page)).started).toHaveLength(1);
  await expectNoDevelopmentSurface(page);
  expect(foreign).toEqual([]);
});

test('cancel returns to the chooser, and Subscribe again continues the same purchase', async ({ page }) => {
  test.setTimeout(120_000);
  await planStep(page);
  await startCheckout(page);
  await billingReturn(page, { result: 'cancel' });
  await expect(subscribe(page)).toBeVisible({ timeout: 30_000 });
  await expect(controls(page).getByRole('status').filter({ hasText: 'Checkout cancelled' })).toBeVisible();
  expect((await checkout(page)).confirmed).toEqual([]);
  // The account still has no plan, and the same intent is reused.
  await expect(controls(page).getByText('No plan', { exact: true })).toBeVisible();
  await subscribe(page).click();
  await expect(chooser(page).getByRole('button', { name: 'Check payment', exact: true })).toBeVisible({ timeout: 30_000 });
  const { started } = await checkout(page);
  expect(started).toHaveLength(2);
  expect(started[1].idempotencyKey).toBe(started[0].idempotencyKey);
  // Leaving the waiting state by hand is the same as cancel: the chooser, nothing confirmed.
  await chooser(page).getByRole('button', { name: 'Back to plans', exact: true }).click();
  await expect(subscribe(page, 'Pro')).toBeVisible();
  // Another plan is a new purchase intent.
  await subscribe(page, 'Pro').click();
  await expect.poll(async () => (await checkout(page)).started.length, { timeout: 30_000 }).toBe(3);
  const again = (await checkout(page)).started;
  expect(again[2].planKey).toBe('pro_monthly');
  expect(again[2].idempotencyKey).not.toBe(again[0].idempotencyKey);
});

test('confirm replay: a checkout Cloud already settled is a success, and a second return confirms nothing', async ({ page }) => {
  test.setTimeout(120_000);
  await planStep(page);
  await startCheckout(page);
  await setStub(page, { checkout: { ...(await stub(page, s => s.checkout)), confirm: 'replayed' } });
  await billingReturn(page, { result: 'success', sessionId: STUB_CHECKOUT_SESSION });
  await expectPlanActive(page);
  // The same link again (a second tap in the browser): nothing is recorded, so nothing is sent.
  await billingReturn(page, { result: 'success', sessionId: STUB_CHECKOUT_SESSION });
  await billingReturn(page, { result: 'cancel' });
  await page.waitForTimeout(500);
  expect((await checkout(page)).confirmed).toEqual([STUB_CHECKOUT_SESSION]);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('process death between checkout and return: the restarted app confirms the recorded checkout', async ({ page }) => {
  test.setTimeout(150_000);
  await planStep(page);
  await startCheckout(page);
  const key = (await checkout(page)).started[0].idempotencyKey;
  // The owner has not paid yet when Alpha is killed and started again.
  await setStub(page, { checkout: { ...(await stub(page, s => s.checkout)), confirm: 'unpaid' } });
  await page.reload();
  await expect.poll(() => harness(page, f => f.calls.includes('Agent.start')), { timeout: 30_000 }).toBe(true);
  await expect(sheet(page)).toBeVisible({ timeout: 30_000 });
  // The step resumes waiting for the same checkout and asks Cloud once, quietly.
  await expect(chooser(page).getByRole('button', { name: 'Check payment', exact: true })).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () => (await checkout(page)).confirmed, { timeout: 30_000 }).toEqual([STUB_CHECKOUT_SESSION]);
  await expect(chooser(page).getByRole('alert')).toHaveCount(0);
  expect(await pending(page)).toMatchObject({ idempotencyKey: key, sessionId: STUB_CHECKOUT_SESSION });
  // "Open checkout again" continues the same purchase with the same key.
  await chooser(page).getByRole('button', { name: 'Open checkout again', exact: true }).click();
  await expect.poll(async () => (await checkout(page)).started.length, { timeout: 30_000 }).toBe(2);
  expect((await checkout(page)).started[1].idempotencyKey).toBe(key);
  // Asked by hand while still unpaid: said plainly, still waiting.
  await expect(chooser(page).getByRole('button', { name: 'Check payment', exact: true })).toBeEnabled({ timeout: 30_000 });
  await chooser(page).getByRole('button', { name: 'Check payment', exact: true }).click();
  await expect(chooser(page).getByRole('alert')).toHaveText('Payment not confirmed yet', { timeout: 30_000 });
  // The payment lands; the return link arrives in the restarted app.
  await setStub(page, { checkout: { ...(await stub(page, s => s.checkout)), confirm: 'ok' } });
  await billingReturn(page, { result: 'success', sessionId: STUB_CHECKOUT_SESSION });
  await expectPlanActive(page);
});

test('process death before the checkout answer: Subscribe after the restart reuses the idempotency key', async ({ page }) => {
  test.setTimeout(150_000);
  await planStep(page);
  await setStub(page, { checkout: { ...(await stub(page, s => s.checkout)), start: 'lost' } });
  await subscribe(page).click();
  await expect(chooser(page).getByRole('alert')).toHaveText('No connection. Try again', { timeout: 30_000 });
  const key = (await checkout(page)).started[0].idempotencyKey;
  expect(await pending(page)).toMatchObject({ idempotencyKey: key, sessionId: null });
  expect(await stub(page, s => s.opened)).toEqual([]);
  await setStub(page, { checkout: { ...(await stub(page, s => s.checkout)), start: 'completed' } });
  await page.reload();
  await expect.poll(() => harness(page, f => f.calls.includes('Agent.start')), { timeout: 30_000 }).toBe(true);
  await expect(subscribe(page)).toBeVisible({ timeout: 30_000 });
  // Cloud reports the lost request's purchase as already paid: no second payment page.
  await setStub(page, { accounts: [{ token: 'synthetic-cloud-key', userId: id, email: 'owner@example.invalid', balance: 0 }] });
  await subscribe(page).click();
  await expectPlanActive(page);
  const { started } = await checkout(page);
  expect(started.map(row => row.idempotencyKey)).toEqual([key, key]);
  expect(await stub(page, s => s.opened)).toEqual([]);
});

for (const [name, refusal, message] of [
  ['503 account_not_ready', { status: 503, code: 'account_not_ready' }, 'Your account is still being set up. Try again in a moment'],
  ['409 identity_conflict', { status: 409, code: 'identity_conflict' }, 'This sign-in can’t be linked to an account. Sign out and sign in another way'],
] as const) test(`${name} at checkout is said precisely and the same purchase can be retried`, async ({ page }) => {
  test.setTimeout(120_000);
  await planStep(page);
  await setStub(page, { checkout: { ...(await stub(page, s => s.checkout)), start: refusal } });
  await subscribe(page).click();
  await expect(chooser(page).getByRole('alert')).toHaveText(message, { timeout: 30_000 });
  // Nothing opened; the chooser is still usable; the account is still signed in.
  expect(await stub(page, s => s.opened)).toEqual([]);
  await expect(subscribe(page)).toBeEnabled();
  await expect(controls(page).getByRole('button', { name: 'I have a code', exact: true })).toBeEnabled();
  await expect(controls(page)).toContainText('owner@example.invalid');
  await setStub(page, { checkout: { ...(await stub(page, s => s.checkout)), start: 'open' } });
  await startCheckout(page);
  const { started } = await checkout(page);
  expect(started[1].idempotencyKey).toBe(started[0].idempotencyKey);
  await expect(chooser(page).getByRole('alert')).toHaveCount(0);
  // The same refusals when confirming leave the checkout waiting, and a later confirmation succeeds.
  await setStub(page, { checkout: { ...(await stub(page, s => s.checkout)), confirm: refusal } });
  await billingReturn(page, { result: 'success', sessionId: STUB_CHECKOUT_SESSION });
  await expect(chooser(page).getByRole('alert')).toHaveText(message, { timeout: 30_000 });
  await expect(chooser(page).getByRole('button', { name: 'Check payment', exact: true })).toBeEnabled({ timeout: 30_000 });
  await setStub(page, { checkout: { ...(await stub(page, s => s.checkout)), confirm: 'ok' } });
  await chooser(page).getByRole('button', { name: 'Check payment', exact: true }).click();
  await expectPlanActive(page);
});

test('401 at checkout asks the owner to sign in again; nothing opens and the purchase intent is kept', async ({ page }) => {
  test.setTimeout(120_000);
  await planStep(page, { nativeSignIn: true });
  // Cloud no longer accepts this phone's key (revoked, or its renewal window closed).
  await setStub(page, { accounts: [{ token: 'another-phone-key', userId: id, email: 'owner@example.invalid', balance: 0, plan: 'credits' }], checkout: { ...(await stub(page, s => s.checkout)), start: { status: 401, code: 'authentication_required' } } });
  await subscribe(page).click();
  await expect.poll(async () => (await checkout(page)).started.length, { timeout: 30_000 }).toBe(1);
  expect(await stub(page, s => s.opened)).toEqual([]);
  // The account and plan are read again; Cloud refuses the key, so Alpha asks for sign-in.
  const signIn = page.getByRole('main', { name: 'Alpha', exact: true });
  await expect(signIn.getByRole('form', { name: 'Sign in with email', exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(signIn.getByRole('alert')).toHaveText('Sign-in expired');
  await expect(page.getByRole('region', { name: 'Choose a plan', exact: true })).toHaveCount(0);
  expect(await pending(page)).toMatchObject({ planKey: 'plus_monthly', sessionId: null });
});

test('an account that already has a plan never sees the plan step', async ({ page }) => {
  test.setTimeout(120_000);
  const foreign = await boot(page, { plan: undefined, balance: 5 });
  await expect.poll(() => configured(page), { timeout: 30_000 }).toBeGreaterThan(0);
  await expect(page.getByRole('region', { name: 'Choose a plan', exact: true })).toHaveCount(0);
  await expect(sheet(page)).toHaveCount(0);
  const cloud = await stub(page, s => s.cloud) as Array<{ path: string }>;
  expect(cloud.filter(row => row.path.startsWith('/api/v1/subscriptions/'))).toEqual([]);
  expect(await pending(page)).toBeNull();
  expect(foreign).toEqual([]);
});

test('without a published catalogue the hosted plan page stays the way to choose a plan', async ({ page }) => {
  test.setTimeout(120_000);
  await boot(page, {}, {});
  await expect(sheet(page)).toBeVisible({ timeout: 30_000 });
  await expect(controls(page).getByRole('button', { name: 'Choose a plan', exact: true })).toBeVisible();
  await expect(controls(page).getByRole('button', { name: 'Use code', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Choose a plan', exact: true })).toHaveCount(0);
  await controls(page).getByRole('button', { name: 'Choose a plan', exact: true }).click();
  await expect.poll(() => stub(page, s => s.opened), { timeout: 30_000 }).toEqual(['https://cloud.eliza.app/cloud/billing']);
  expect((await checkout(page)).started).toEqual([]);
});

test('redeem from the plan step: an accepted code activates the plan without a checkout', async ({ page }) => {
  test.setTimeout(120_000);
  await planStep(page);
  await controls(page).getByRole('button', { name: 'I have a code', exact: true }).click();
  const field = controls(page).getByRole('textbox', { name: 'Membership code' });
  await expect(field).toBeFocused();
  await field.fill(CODE);
  await controls(page).getByRole('button', { name: 'Redeem', exact: true }).click();
  await expect(page.getByText(/^Code redeemed for Plus\./)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('region', { name: 'Choose a plan', exact: true })).toHaveCount(0);
  expect(await stub(page, s => s.redeemed.length)).toBe(1);
  expect((await checkout(page)).started).toEqual([]);
  expect(await stub(page, s => s.opened)).toEqual([]);
});

for (const [mode, message] of [
  ['invalid', 'This code could not be redeemed. Check the code and try again.'],
  ['used', 'This account has already received this subscription. Check your plan again.'],
] as const) test(`redeem from the plan step: ${mode === 'used' ? 'a code this account already used' : 'an invalid code'} is refused precisely and the chooser stays`, async ({ page }) => {
  test.setTimeout(120_000);
  await planStep(page);
  await setStub(page, { redeem: mode });
  await controls(page).getByRole('button', { name: 'I have a code', exact: true }).click();
  const field = controls(page).getByRole('textbox', { name: 'Membership code' });
  await field.fill(CODE);
  await controls(page).getByRole('button', { name: 'Redeem', exact: true }).click();
  await expect(controls(page).getByRole('alert')).toHaveText(message, { timeout: 30_000 });
  await expect(field).toHaveValue(CODE);
  await expect(controls(page).getByText('No plan', { exact: true })).toBeVisible();
  // Recoverable in place: the plans are still offered and another code can be entered.
  await expect(subscribe(page)).toBeEnabled();
  await setStub(page, { redeem: 'ok' });
  await controls(page).getByRole('button', { name: 'Redeem', exact: true }).click();
  await expect(page.getByText(/^Code redeemed for Plus\./)).toBeVisible({ timeout: 30_000 });
  expect(await stub(page, s => s.redeemed.length)).toBe(2);
});
