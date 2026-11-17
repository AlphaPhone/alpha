import {test, expect, type Page} from '@playwright/test';
import {setupTelephony} from './telephony-fixture';
// Contacts and Messages search live in the app header beside the + button (the Inbox pattern), and
// the open chat field has no left slot on the Contacts, Messages and Phone lists (docs/agentic-comms.md
// AC-08). Renderer evidence only: the image shape is the stubbed telephony bridge, and no device,
// address book or SMS provider is involved.

const systemBack = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event('alpha-back', {cancelable: true})));
const openApp = (page: Page, name: string) => page.getByRole('button', {name, exact: true}).first().click();
/** The open chat field's left slot: none on lists, Recents and the keypad. */
async function noLeftSlot(page: Page) {
  await page.getByRole('button', {name: 'Open Alpha', exact: true}).click();
  await expect(page.locator('[data-alpha-input-bar] [data-alpha-bar-field="alpha"], .alpha-chat-composer').first()).toBeVisible();
  await expect(page.locator('[data-alpha-bar-left]')).toHaveCount(0);
  for (const name of ['Back to search', 'Back to the keypad']) await expect(page.getByRole('button', {name, exact: true})).toHaveCount(0);
}
/** The header search: its button sits beside +, opens a focused field, filters, clears and closes on Back
 *  (the system Back on the image shape; the header's own Back where the shell draws one). */
async function headerSearch(page: Page, o: {button: string; plus: string; form: string; field: string; query: string; kept: string; dropped: string; rows: () => ReturnType<Page['locator']>; back: () => Promise<unknown>}) {
  const button = page.getByRole('button', {name: o.button, exact: true}), plus = page.getByRole('button', {name: o.plus, exact: true});
  await expect(button).toBeVisible();
  await expect(plus).toBeVisible();
  const [b, p] = await Promise.all([button.boundingBox(), plus.boundingBox()]);
  expect(Math.abs(b!.y - p!.y), 'search sits in the + button row').toBeLessThan(4);
  expect(b!.x, 'search sits left of +').toBeLessThan(p!.x);
  await button.click();
  const form = page.getByRole('search', {name: o.form, exact: true}), field = form.getByRole('searchbox', {name: o.field, exact: true});
  await expect(field).toBeFocused();
  await field.pressSequentially(o.query);
  await expect(o.rows().filter({hasText: o.kept})).toHaveCount(1);
  await expect(o.rows().filter({hasText: o.dropped})).toHaveCount(0);
  await form.getByRole('button', {name: 'Clear search', exact: true}).click();
  await expect(field).toHaveValue('');
  await expect(field).toBeFocused();
  await expect(o.rows().filter({hasText: o.dropped})).toHaveCount(1);
  await field.pressSequentially(o.query);
  await expect(o.rows().filter({hasText: o.dropped})).toHaveCount(0);
  await o.back();
  await expect(form).toHaveCount(0);
  await expect(button).toBeVisible();
  await expect(o.rows().filter({hasText: o.dropped}), 'Back closes the search and its filter').toHaveCount(1);
}

test.describe('Alpha image shape (telephony-fixture.ts): header search and no chat left slot', () => {
  test('Contacts searches from the header beside New contact; the open chat has no magnifier', async ({page}) => {
    await setupTelephony(page);
    await openApp(page, 'Contacts');
    await headerSearch(page, {button: 'Search contacts', plus: 'New contact', form: 'Search contacts', field: 'Search contacts', query: 'ad', kept: 'Farid Haddad', dropped: 'Bao Tran',
      rows: () => page.locator('[data-alpha-layer="app"] button.tap'), back: () => systemBack(page)});
    await noLeftSlot(page);
  });

  test('Messages searches from the header beside New message; the open chat has no magnifier', async ({page}) => {
    await setupTelephony(page);
    await openApp(page, 'Messages');
    await headerSearch(page, {button: 'Search messages', plus: 'New message', form: 'Search messages', field: 'Search conversations', query: 'birth', kept: 'Grace Lindqvist', dropped: 'Bao Tran',
      rows: () => page.locator('[data-alpha-messages-threads] > button'), back: () => systemBack(page)});
    await noLeftSlot(page);
  });

  test('Phone with the chat open shows no keypad button beside the chat field', async ({page}) => {
    await setupTelephony(page);
    await openApp(page, 'Phone');
    await noLeftSlot(page);
  });
});

test.describe('fixture dev build (?fixture=1&mode=dev, ELIZA_DEV_ALLOW_TEST_MOCKS=1): header search and no chat left slot', () => {
  test.beforeEach(async ({page}) => { await page.goto('/?mode=dev&fixture=1'); });

  test('Contacts searches from the header beside New contact; the open chat has no magnifier', async ({page}) => {
    await openApp(page, 'Contacts');
    await headerSearch(page, {button: 'Search contacts', plus: 'New contact', form: 'Search contacts', field: 'Search contacts', query: 'lum', kept: 'Maya Chen', dropped: 'Sam Okafor',
      rows: () => page.locator('[data-alpha-layer="app"] button.tap'), back: () => page.getByRole('button', {name: 'Back to contacts', exact: true}).click()});
    await noLeftSlot(page);
  });

  test('Messages searches from the header beside New message; the open chat has no magnifier', async ({page}) => {
    await openApp(page, 'Messages');
    await headerSearch(page, {button: 'Search messages', plus: 'New message', form: 'Search messages', field: 'Search conversations', query: 'figma', kept: 'Maya', dropped: 'Priya',
      rows: () => page.locator('[data-alpha-messages-dev] .scr > div'), back: () => page.getByRole('button', {name: 'Back to messages', exact: true}).click()});
    await noLeftSlot(page);
  });

  test('Phone with the chat open shows no keypad button beside the chat field', async ({page}) => {
    await openApp(page, 'Phone');
    await noLeftSlot(page);
  });
});
