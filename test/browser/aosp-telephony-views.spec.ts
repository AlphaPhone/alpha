import {test, expect, type Page} from '@playwright/test';
import {setupTelephony} from './telephony-fixture';
// The designed Phone, Messages and Contacts views against a stubbed bridge in the Alpha image shape
// (telephony-fixture.ts). Evidence for the renderer only: no device, SIM, carrier or provider is
// involved, and a call "placed" or a text handed to the bridge here proves nothing about a radio.
const inputs = (page: Page, method: string) => page.evaluate(method => ((window as any).telephonyInputs as [string, any][]).filter(row => row[0] === method).map(row => row[1]), method);
const open = (page: Page, name: string) => page.getByRole('button', {name, exact: true}).first().click();
const pill = '[data-alpha-layer="pill"]';
/** True when two elements' boxes overlap on screen. */
async function overlaps(page: Page, first: string, second: string) {
  const [a, b] = await Promise.all([page.locator(first).boundingBox(), page.locator(second).boundingBox()]);
  if (!a || !b) throw Error(`missing ${!a ? first : second}`);
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

test('Home shows one Messages card and one Phone card and keeps no telephony content', async ({page}) => {
  await setupTelephony(page);
  await expect(page.getByRole('button', {name: 'Open Messages, 2 unread'})).toBeVisible();
  await expect(page.getByRole('button', {name: /^Open Phone/})).toBeVisible();
  await page.getByRole('button', {name: 'Open Messages, 2 unread'}).click();
  await expect(page.locator('[data-alpha-messages-threads]')).toBeVisible();
  expect(await page.evaluate(() => /Ada Okafor|Running ten minutes/.test(JSON.stringify({...localStorage})))).toBe(false);
});

test('recents call on the owner tap; the keypad fits above the bar on a small phone', async ({page}) => {
  await setupTelephony(page);
  await open(page, 'Phone');
  await page.getByRole('button', {name: /^Call Carmen Ruiz, outgoing/}).click();
  await expect.poll(() => inputs(page, 'placeCall')).toEqual([{number: '+15550100103'}]);
  await expect(page.getByRole('button', {name: /^Unknown, missed/})).toBeDisabled();
  await page.locator('[data-alpha-phone-tab="keypad"]').click();
  for (const key of ['5', '5', '5', '0', '1', '0', '0', '1', '0', '4']) await page.getByRole('button', {name: key, exact: true}).click();
  await expect(page.locator('[data-alpha-phone-number]')).toHaveValue('5550100104');
  await expect(page.getByRole('button', {name: 'Call Dev Patel'})).toBeVisible();
  for (const size of [{width: 412, height: 915}, {width: 360, height: 640}]) {
    await page.setViewportSize(size);
    await expect(page.locator('[data-alpha-phone-call]')).toBeInViewport({ratio: 1});
    expect(await overlaps(page, '[data-alpha-phone-call]', '[data-alpha-input-bar]'), `${size.width}x${size.height}`).toBe(false);
    expect(await overlaps(page, '[data-alpha-phone-number]', '[data-alpha-phone-keypad] button[aria-label="1"]')).toBe(false);
  }
  await page.locator('[data-alpha-phone-call]').click();
  await expect.poll(() => inputs(page, 'placeCall')).toEqual([{number: '+15550100103'}, {number: '5550100104'}]);
  await expect(page.locator('[data-alpha-phone-number]')).toHaveValue('');
});

test('voicemail opens with its transcript, deletes only after confirmation, and is absent without a carrier source', async ({page}) => {
  await setupTelephony(page);
  await open(page, 'Phone');
  await page.locator('[data-alpha-phone-tab="voicemail"]').click();
  await page.getByRole('button', {name: /^Voicemail from Ada Okafor/}).click();
  await expect(page.locator('[data-alpha-phone-transcript]')).toContainText('The keys are with the neighbour');
  await expect(page.locator('[data-alpha-phone-play]')).toBeVisible();
  expect(await inputs(page, 'deleteVoicemail')).toEqual([]);
  await page.locator('[data-alpha-phone-voicemail-delete]').click();
  expect(await inputs(page, 'deleteVoicemail')).toEqual([]);
  await page.locator('[data-alpha-phone-voicemail-confirm]').click();
  await expect.poll(() => inputs(page, 'deleteVoicemail')).toEqual([{id: '31'}]);
  await expect(page.getByRole('button', {name: /^Voicemail from Ada Okafor/})).toHaveCount(0);
});
test('a phone whose carrier has no voicemail source shows no voicemail tab', async ({page}) => {
  await setupTelephony(page, {voicemail: 'unsupported'});
  await open(page, 'Phone');
  await expect(page.locator('[data-alpha-phone-tab="recents"]')).toBeVisible();
  await expect(page.locator('[data-alpha-phone-tab="voicemail"]')).toHaveCount(0);
});

// AP-16: the one bottom bar is the composer. In a conversation it addresses the person; on the list it filters.
const personField = '[data-alpha-bar-field="person"]';
const barSend = (page: Page) => page.locator('[data-alpha-input-bar]').getByRole('button', {name: 'Send', exact: true});
test('a conversation has one bottom bar: the bar addresses the person, with no second composer, mic or send', async ({page}) => {
  await setupTelephony(page);
  await open(page, 'Messages');
  await expect(page.locator('[data-alpha-bar-field="filter"]')).toBeVisible();
  await expect(page.locator(pill)).not.toBeVisible();
  await page.getByRole('button', {name: /^Ada Okafor/}).click();
  await expect(page.locator('[data-alpha-messages-title]')).toHaveText('Ada Okafor');
  await expect.poll(() => inputs(page, 'markThreadRead')).toHaveLength(1);
  await expect(page.locator('[data-alpha-composer]:visible')).toHaveCount(1);
  await expect(page.locator(personField)).toBeVisible();
  await expect(page.locator(personField)).toHaveAttribute('placeholder', /^Text /);
  for (const gone of ['[data-alpha-messages-body]', '[data-alpha-messages-send]', '[data-alpha-messages-alpha]']) await expect(page.locator(gone)).toHaveCount(0);
  await expect(page.locator('[data-alpha-messages-accessories]')).toBeInViewport({ratio: 1});
  await expect(barSend(page)).toBeDisabled();
  // Text typed in the bar is the owner's text to the person; nothing goes anywhere until Send.
  await page.locator(personField).fill('tell her I am ten minutes away');
  await expect(page.locator(personField)).toHaveValue('tell her I am ten minutes away');
  expect(await inputs(page, 'sendSms')).toEqual([]);
});

test('a draft Alpha was asked for replaces the slot, keeps one Undo, and never sends', async ({page}) => {
  await setupTelephony(page);
  const sms = (call: string, ...args: unknown[]) => page.evaluate(async ([call, args]) => ((await import('/src/prototype/sms-adapter.ts' as string)) as any)[call as string](...(args as unknown[])), [call, args] as const);
  await open(page, 'Messages');
  await expect(page.locator('[data-alpha-messages-threads]')).toBeVisible();
  expect(await sms('placeAskedSmsDraft', 'Ten minutes away')).toBe('none-selected');
  await page.getByRole('button', {name: /^Ada Okafor/}).click();
  await expect(page.locator('[data-alpha-messages-title]')).toHaveText('Ada Okafor');
  expect(await sms('placeAskedSmsDraft', 'Wrong person', '+15550100102'), 'a draft for another number does not land here').toBe('none-selected');
  expect(await sms('placeAskedSmsDraft', 'Same ten digits abroad', '+445550100101')).toBe('none-selected');
  expect(await sms('placeAskedSmsDraft', 'Ten minutes away', '+1 (555) 010-0101')).toBe('drafted');
  await expect(page.locator(personField)).toHaveValue('Ten minutes away');
  expect(await sms('placeAskedSmsDraft', 'A second draft')).toBe('drafted');
  await expect(page.locator(personField)).toHaveValue('A second draft');
  await page.locator(personField).fill('My own words');
  expect(await sms('placeAskedSmsDraft', 'Alpha rewrote it')).toBe('drafted');
  await expect(page.locator(personField)).toHaveValue('Alpha rewrote it');
  expect(await sms('readSmsDraft')).toEqual({by: 'alpha', text: 'Alpha rewrote it', canUndo: true, threadId: expect.any(String)});
  expect(await sms('undoSmsDraft')).toBe(true);
  await expect(page.locator(personField)).toHaveValue('My own words');
  expect(await sms('undoSmsDraft'), 'one Undo').toBe(false);
  expect(await inputs(page, 'sendSms')).toEqual([]);
});

test('suggested replies explain model-provider use before enabling the setting', async ({page}) => {
  await setupTelephony(page);
  await open(page, 'Messages');
  await page.getByRole('button', {name: /^Ada Okafor/}).click();
  const suggestion = page.locator('[data-alpha-messages-suggest]');
  const review = page.getByRole('group', {name: 'Turn on suggested replies'});
  const preference = () => page.evaluate(() => localStorage.getItem('alpha.messages.suggest-replies.v1'));
  await suggestion.click();
  await expect(review).toContainText('connected model provider');
  expect(await preference()).toBeNull();
  await review.getByRole('button', {name: 'Cancel'}).click();
  await expect(review).toHaveCount(0);
  expect(await preference()).toBeNull();
  await suggestion.click();
  await review.getByRole('button', {name: 'Turn on'}).click();
  await expect(suggestion).toHaveAttribute('aria-pressed', 'true');
  expect(await preference()).toBe('1');
  await suggestion.click();
  await expect(suggestion).toHaveAttribute('aria-pressed', 'false');
  expect(await preference()).toBeNull();
});

test('the open conversation owns its send target after a new-message draft', async ({page}) => {
  await setupTelephony(page);
  await open(page, 'Messages');
  await page.locator('[data-alpha-messages-new]').click();
  await page.locator('[data-alpha-messages-recipients]').fill('+15550100102');
  await page.locator(personField).fill('Draft for Bao');
  await page.locator('[data-alpha-messages]').getByRole('button', {name: 'Back', exact: true}).click();
  await page.getByRole('button', {name: /^Ada Okafor/}).click();
  await expect(page.locator('[data-alpha-messages-title]')).toHaveText('Ada Okafor');
  await expect(page.locator(personField)).toHaveValue('');
  await page.locator(personField).fill('Draft for Ada');
  await barSend(page).click();
  await expect.poll(async () => (await inputs(page, 'sendSms')).map(input => [input.recipients, input.body])).toEqual([[['+15550100101'], 'Draft for Ada']]);
});

test('one unread thread opened from Home can send only to that conversation', async ({page}) => {
  await setupTelephony(page, {singleUnread: true});
  await page.getByRole('button', {name: 'Open Messages, 1 unread'}).click();
  await expect(page.locator('[data-alpha-messages-title]')).toHaveText('Ada Okafor');
  await page.locator(personField).fill('Draft for Ada');
  await barSend(page).click();
  await expect.poll(async () => (await inputs(page, 'sendSms')).map(input => input.recipients)).toEqual([['+15550100101']]);
});

test('Messages can open a system review without SMS permissions and request each missing permission', async ({page}) => {
  await setupTelephony(page, {granted: false});
  await open(page, 'Messages');
  await expect(page.getByRole('button', {name: 'Allow SMS read access'})).toBeVisible();
  await page.locator('[data-alpha-messages-new]').click();
  await page.locator('[data-alpha-messages-recipients]').fill('+15550100102');
  await page.locator(personField).fill('A draft for the messaging app');
  await page.getByRole('button', {name: 'Review in messaging app'}).click();
  await expect.poll(() => inputs(page, 'composeSms')).toEqual([{recipients: ['+15550100102'], body: 'A draft for the messaging app'}]);
  await page.getByRole('button', {name: 'Allow SMS send access'}).click();
  await page.getByRole('button', {name: 'Allow SIM access'}).click();
  await expect.poll(() => inputs(page, 'requestAccess')).toEqual([{access: 'sendSms'}, {access: 'phoneState'}]);
  await expect(barSend(page)).toBeEnabled();
});

test('a new message offers matching contacts and addresses the one tapped', async ({page}) => {
  await setupTelephony(page);
  await open(page, 'Messages');
  await page.locator('[data-alpha-messages-new]').click();
  await expect(page.locator('[data-alpha-messages-picks] button')).toHaveCount(9);
  await page.locator('[data-alpha-messages-recipients]').fill('carm');
  await expect(page.locator('[data-alpha-messages-picks] button')).toHaveCount(1);
  await page.getByRole('button', {name: 'Carmen Ruiz, (555) 010-0103'}).click();
  await expect(page.locator('[data-alpha-messages-recipients]')).toHaveValue('+15550100103');
  await expect(page.locator('[data-alpha-messages-picks]').getByRole('button', {name: /Carmen Ruiz/})).toHaveCount(0);
});

test('Contacts searches in place, edits in the app with the version it read, and deletes after confirmation', async ({page}) => {
  await setupTelephony(page);
  await open(page, 'Contacts');
  await expect(page.locator('[data-alpha-contacts-search]')).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Contacts'})).toHaveCount(0);
  await page.locator('[data-alpha-contacts-search]').fill('carm');
  await expect.poll(async () => (await inputs(page, 'contacts.list')).at(-1)?.query).toBe('carm');
  await page.getByRole('button', {name: /Carmen Ruiz/}).first().click();
  await expect(page.getByText('(555) 010-0103', {exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Edit contact', exact: true}).click();
  await expect(page.locator('[data-alpha-contact-editor]')).toBeVisible();
  await page.locator('[data-alpha-contact-name]').fill('Carmen R. Ruiz');
  await page.locator('[data-alpha-contact-save]').click();
  await expect.poll(() => inputs(page, 'contacts.save')).toHaveLength(1);
  const saved = (await inputs(page, 'contacts.save'))[0];
  expect(saved.id).toBe('13');
  expect(saved.version).toMatch(/^[0-9a-f]{64}$/);
  expect(saved.displayName).toBe('Carmen R. Ruiz');
  expect(saved.phoneNumbers).toEqual([{number: '+15550100103', type: 'mobile'}]);
  await expect(page.locator('[data-alpha-contact-editor]')).toHaveCount(0);
  expect(await inputs(page, 'contacts.remove')).toEqual([]);
  await page.locator('[data-alpha-contact-delete]').click();
  expect(await inputs(page, 'contacts.remove')).toEqual([]);
  await page.locator('[data-alpha-contact-confirm]').getByRole('button', {name: 'Delete', exact: true}).click();
  await expect.poll(() => inputs(page, 'contacts.remove')).toHaveLength(1);
  expect(await page.evaluate(() => /Carmen/.test(JSON.stringify({...localStorage})))).toBe(false);
});

test('Settings shows the SIM, carrier, number and network, and links to Android for the IMEI', async ({page}) => {
  await setupTelephony(page);
  await open(page, 'Settings');
  await page.getByRole('button', {name: 'General', exact: true}).click();
  expect(await inputs(page, 'phoneInfo'), 'nothing is read before the page opens').toEqual([]);
  await page.getByRole('button', {name: 'Phone', exact: true}).click();
  for (const text of ['Synthetic Carrier', '(555) 010-0100', '5G', 'Good', 'Slot 1']) await expect(page.getByText(text, {exact: true})).toBeVisible();
  await expect(page.getByText('Alpha', {exact: true}).first()).toBeVisible();
  expect(await inputs(page, 'phoneInfo')).toHaveLength(1);
  await page.getByRole('button', {name: 'IMEI', exact: true}).click();
  await expect.poll(() => inputs(page, 'openSettings')).toEqual([{page: 'about'}]);
  expect(await page.evaluate(() => /Synthetic Carrier|5550100100/.test(JSON.stringify({...localStorage})))).toBe(false);
});
