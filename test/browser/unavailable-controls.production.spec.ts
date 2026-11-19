// PROD-03 on the flag-off production renderer: no control that a phone without a connection shows
// answers only with a toast saying it is unavailable. Each enabled view is opened, and every
// visible enabled button on its first screen is pressed once, from a freshly opened view.
//
// Evidence boundary: source/test evidence for the flag-off renderer only, with the Android bridge
// stubbed (flag-off-android.ts, resident-stub.ts); handoffs answer "opened". It covers each view's
// first screen, not every sub-page, and is not a device, TalkBack or native-app pass.
import {test, expect, type Page} from '@playwright/test';
import {flagOffAndroid, fenceNetwork, residentHome, button} from './flag-off-android';
import {residentStub} from './resident-stub';

test.describe.configure({mode: 'parallel'});

const VIEWS = [
  {name: 'Inbox', view: 'inbox'}, {name: 'Calendar', view: 'calendar'}, {name: 'Browser', view: 'browser'},
  {name: 'Camera', view: 'camera'}, {name: 'Photos', view: 'photos'}, {name: 'Maps', view: 'maps'}, {name: 'Notes', view: 'notes'},
  {name: 'Files', view: 'files'}, {name: 'Workflows', view: 'workflows'}, {name: 'Settings', view: 'settings'},
] as const;
/** The toasts a placeholder control gave (native-adapter.ts `unavailable`, agent-adapter.ts `api.say`). */
const PLACEHOLDER = /^(Unavailable|Not connected|Use [A-Z][a-z]+ app|Open in Calendar|Not available yet\. Nothing was sent\.)$/;
const MAIL = {connectionId: 'qa-mailbox', email: 'qa@example.invalid', connected: true, messages: [
  {externalId: 'm1', threadId: 't1', subject: 'Quarterly plan', from: 'Rae Jones', fromEmail: 'rae@example.invalid', to: ['qa@example.invalid'], snippet: 'Draft attached', bodyText: 'Draft attached for review.', historyId: '1'},
]};
const region = (page: Page) => page.locator('[data-alpha-layer="app"][role="region"]');

async function start(page: Page) {
  await fenceNetwork(page);
  await flagOffAndroid(page, {accounts: [MAIL]});
  await residentStub(page);
  // Every handoff to another Android app answers "opened", so a real handoff never reads as a failure.
  await page.addInitScript(() => {
    const cap = (window as any).Capacitor, previous = cap.nativePromise;
    const handoffs: Record<string, string> = {DailyApps: 'perform', AlphaDevice: 'openSettings'};
    for (const [name, method] of Object.entries(handoffs)) {
      let row = cap.PluginHeaders.find((header: any) => header.name === name);
      if (!row) cap.PluginHeaders.push(row = {name, methods: []});
      if (!row.methods.some((m: any) => m.name === method)) row.methods.push({name: method, rtype: 'promise'});
    }
    cap.nativePromise = async (plugin: string, method: string, input: unknown) =>
      handoffs[plugin] === method ? {status: 'opened'} : previous(plugin, method, input);
  });
  await residentHome(page);
  // Record every toast the mounted shell shows, whoever asks for it.
  await page.evaluate(() => {
    const screen = document.querySelector('[data-screen]') as any, key = Object.keys(screen).find(name => name.startsWith('__reactFiber$'))!;
    let fiber = screen[key];
    while (fiber && !(fiber.stateNode && typeof fiber.stateNode.S === 'function' && typeof fiber.stateNode.toast === 'function')) fiber = fiber.return;
    const shell = fiber.stateNode, toast = shell.toast;
    const seen: string[] = (window as any).__toasts = [];
    shell.toast = function (message: unknown, ...rest: unknown[]) { seen.push(String(message)); return toast.call(this, message, ...rest); };
  });
}
const toasts = (page: Page) => page.evaluate(() => (window as any).__toasts.splice(0) as string[]);
async function open(page: Page, name: string, view: string) {
  // Back out of any sheet or sub-page a press opened, then return Home and open the view again.
  for (let i = 0; i < 4; i++) await page.evaluate(() => window.dispatchEvent(new Event('alpha-back', {cancelable: true})));
  await page.evaluate(() => window.dispatchEvent(new Event('launcher-home')));
  const minimize = page.getByRole('button', {name: 'Minimize chat', exact: true});
  if (await minimize.isVisible()) await minimize.click();
  await button(page, name).click();
  await expect(page.locator('html')).toHaveAttribute('data-active-view', view);
  await expect(region(page)).toBeVisible();
}
/** The visible buttons on the view's first screen, in order. */
const buttons = (page: Page) => region(page).getByRole('button').filter({visible: true});
const label = (page: Page, index: number) => buttons(page).nth(index).evaluate(el => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim());

for (const {name, view} of VIEWS) {
  test(`no control on ${name}'s first screen only says it is unavailable`, async ({page}) => {
    test.setTimeout(300_000);
    await start(page);
    await open(page, name, view);
    const count = await buttons(page).count();
    const names: string[] = [];
    for (let index = 0; index < count; index++) names.push(await label(page, index));
    expect(count, `${name} shows controls`).toBeGreaterThan(0);
    const said: string[] = [], pressed: string[] = [], moved: string[] = [], opening = new Set<string>();
    // A notice from loading the view is not a press: here Browser's saved bookmarks and the
    // Workflows list fail to load, as the harness answers neither source.
    const settle = async () => { await page.waitForTimeout(300); for (const text of await toasts(page)) opening.add(text); };
    await settle();
    for (const [index, expected] of names.entries()) {
      if (index) { await open(page, name, view); await settle(); }
      // Each press starts from the same first screen; one that no longer matches is reported, not guessed at.
      if (await buttons(page).count() <= index || await label(page, index) !== expected) { moved.push(expected); continue; }
      const target = buttons(page).nth(index);
      if (!await target.isEnabled()) continue;
      await target.click({timeout: 5_000}).catch(() => {});
      await page.waitForTimeout(600);
      pressed.push(expected);
      for (const text of await toasts(page)) if (PLACEHOLDER.test(text)) said.push(`${expected}: ${text}`);
    }
    test.info().annotations.push({type: 'pressed', description: pressed.join(' | ')}, {type: 'not reopened', description: moved.join(' | ')}, {type: 'on opening', description: [...opening].join(' | ')});
    expect(pressed.length, `${name}: pressed ${pressed.join(', ')}`).toBeGreaterThan(0);
    expect(said, said.join('\n')).toEqual([]);
  });
}

test('swiping an Inbox message to the right does not offer a reply it cannot draft', async ({page}) => {
  test.setTimeout(120_000);
  await start(page);
  await open(page, 'Inbox', 'inbox');
  const row = region(page).getByRole('button', {name: /Quarterly plan/}).first();
  await expect(row).toBeVisible({timeout: 30_000});
  await toasts(page);
  const box = (await row.boundingBox())!;
  const y = box.y + box.height / 2, x = box.x + box.width * 0.3;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 160, y, {steps: 6}); await page.mouse.up();
  await page.waitForTimeout(400);
  expect(await toasts(page)).toEqual([]);
  // No reply draft was posted to the conversation either.
  await expect(page.getByText(/Here's a reply to/)).toHaveCount(0);
  await expect(row).toBeVisible();
});
