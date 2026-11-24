import { test, expect, type Page } from '@playwright/test';
import { flagOffAndroid, harness, button, fenceNetwork, residentHome } from './flag-off-android';
import { residentStub } from './resident-stub';

const owner = { token: 'synthetic-cloud-key', userId: '9f1dc45a-4011-4e44-947a-30d999d24fa5', email: 'owner@example.invalid', balance: 5 };
const composer = (page: Page) => page.locator('[data-alpha-layer="composer"][aria-hidden="false"], [data-alpha-layer="conversation"][aria-hidden="false"]').getByRole('textbox').first();
const conversation = (page: Page) => page.locator('[data-alpha-layer="conversation"]');
const UPSTREAM_RUNTIME = 'Eliza needs attention. Check the connected host\'s diagnostics before trying again.';
const ALPHA_RUNTIME = 'Agent error · Send again';

test('notices after an unanswered message collapse to one owner-facing notice, which a later reply retires', async ({ page }) => {
  test.setTimeout(120_000);
  const foreign = await fenceNetwork(page);
  await flagOffAndroid(page);
  await residentStub(page, { accounts: [owner] });
  await residentHome(page);
  await composer(page).fill('Hello agent');
  await composer(page).press('Enter');
  await expect(conversation(page).getByText('Resident reply 1', { exact: true })).toHaveCount(1, { timeout: 30_000 });
  await page.evaluate(notice => {
    const agent = JSON.parse(sessionStorage.getItem('resident-stub-agent') || 'null'), id = agent.conversations[0].id;
    const at = Date.now();
    agent.history[id].push({ id: crypto.randomUUID(), role: 'user', text: 'Still there?', timestamp: at }, ...[1, 2, 3, 4].map(n => ({ id: crypto.randomUUID(), role: 'assistant', text: notice, timestamp: at + n })));
    sessionStorage.setItem('resident-stub-agent', JSON.stringify(agent));
  }, UPSTREAM_RUNTIME);
  await residentHome(page);
  await button(page, 'Open conversation').click();
  await expect(conversation(page).getByText('Still there?', { exact: true })).toHaveCount(1, { timeout: 30_000 });
  await expect(conversation(page).getByText(ALPHA_RUNTIME, { exact: true })).toHaveCount(1);
  await expect(conversation(page).getByText(UPSTREAM_RUNTIME, { exact: true })).toHaveCount(0);
  await harness(page, f => f.replies.push('Here now.'));
  await composer(page).fill('Try again');
  await composer(page).press('Enter');
  await expect(conversation(page).getByText('Here now.', { exact: true })).toHaveCount(1, { timeout: 30_000 });
  await expect(conversation(page).getByText(ALPHA_RUNTIME, { exact: true })).toHaveCount(0);
  expect(await harness(page, f => f.posts)).toEqual(['Try again']);
  expect(await harness(page, f => f.unexpected)).toEqual([]);
  expect(foreign).toEqual([]);
});
