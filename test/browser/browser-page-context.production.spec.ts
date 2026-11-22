import { test, expect, type Page } from '@playwright/test';
import { button, fenceNetwork, flagOffAndroid, harness, residentHome } from './flag-off-android';
import { residentStub, stub } from './resident-stub';
// Browser page for Alpha, flag-off production bundle: with Browser on screen, a chat turn carries
// the open page beside its observation, bound to the observed tab and revision, and only to an agent
// whose status declares `browserPage`.
//
// The AlphaBrowser native plugin is a stub added at the Capacitor bridge here: it commits a
// test-owned page and answers pageContext with what AlphaPageContext would return. Evidence
// boundary: renderer evidence only. Not the isolated-world script on a WebView
// (page-context-script.spec.ts runs it in Chromium), a real agent's prompt or a device.

const PAGE = 'https://harbour-fixture.test/report?day=2';
const READ = { text: '# Harbour report\nTwelve boats came in before noon.', truncated: false, links: [{ text: 'Tide table', url: 'https://harbour-fixture.test/tides' }] };

async function nativeBrowser(page: Page, read: unknown = READ) {
  await page.addInitScript(({ read }) => {
    const w = window as any, bridge = w.Capacitor, previous = bridge.nativePromise;
    const stub = w.browserStub = { reads: [] as any[], sequence: 0, navigation: 0 };
    const promise = (names: string[]) => names.map(name => ({ name, rtype: 'promise' }));
    bridge.PluginHeaders.push({ name: 'AlphaBrowser', methods: [...promise(['create', 'navigate', 'command', 'present', 'close', 'bookmarks', 'setBookmark', 'browsingState', 'saveBrowsingState', 'share', 'downloads', 'clearBrowsingData', 'clearSiteData', 'openExternalBrowser', 'pageContext']), { name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'callback' }] });
    bridge.nativePromise = async (plugin: string, method: string, input: any) => {
      if (plugin !== 'AlphaBrowser') return previous(plugin, method, input);
      if (method === 'bookmarks' || method === 'setBookmark') return { urls: [] };
      if (method === 'browsingState') return {};
      if (method === 'navigate') {
        const navigation = ++stub.navigation;
        setTimeout(() => w.flagOff.emit('AlphaBrowser', 'stateChanged', { session: input.session, id: input.id, private: false, sequence: ++stub.sequence, navigation: String(navigation), url: input.url, title: 'Harbour report', loading: false, committed: true, error: '', canBack: false, canForward: false }), 0);
        return {};
      }
      if (method === 'pageContext') { stub.reads.push(input); return { url: input.url, title: 'Harbour report', ...read }; }
      return {};
    };
  }, { read });
}
const composer = (page: Page) => page.locator('[data-alpha-layer="composer"][aria-hidden="false"], [data-alpha-layer="conversation"][aria-hidden="false"]').getByRole('textbox').first();
async function openPage(page: Page) {
  await button(page, 'Browser').click();
  const address = page.getByRole('textbox', { name: 'Address', exact: true });
  if (!await address.isVisible()) await button(page, 'Search or type address').click();
  await address.fill(PAGE);
  await address.press('Enter');
  await expect(button(page, 'Edit address')).toContainText('harbour-fixture.test');
}
async function ask(page: Page, text: string, reply: number) {
  if (!await composer(page).isVisible()) await button(page, 'Open conversation').click();
  await composer(page).fill(text); await composer(page).press('Enter');
  await expect(page.getByRole('button', { name: `Message actions: Resident reply ${reply}`, exact: true })).toHaveCount(1, { timeout: 30_000 });
  return (await stub(page, s => s.bodies) as any[])[reply - 1];
}
const reads = (page: Page) => page.evaluate(() => (window as any).browserStub.reads as any[]);

test('a turn with Browser open carries the page, bound to the observed tab and revision', async ({ page }) => {
  test.setTimeout(120_000);
  const foreign = await fenceNetwork(page);
  await flagOffAndroid(page);
  await nativeBrowser(page);
  await residentStub(page, { observationSupport: ['calendarDay', 'location', 'browserPage'] });
  await residentHome(page);
  await openPage(page);
  const body = await ask(page, 'Summarize this page', 1);
  const context = body.metadata.clientDevice.context;
  expect(context).toMatchObject({ view: 'browser', sensitive: false, selectedObject: { kind: 'browser-tab' } });
  expect(body.metadata.clientDevice.browserPage).toEqual({
    tabId: context.selectedObject.id, revision: context.selectedObject.revision,
    url: PAGE, title: 'Harbour report', capturedAt: expect.any(Number), ...READ,
  });
  // The authored text is unchanged: the page rides in metadata, never in the message.
  expect(body.text).toBe('Summarize this page');
  const [read] = await reads(page);
  expect(read).toEqual(expect.objectContaining({ url: PAGE, navigation: '1' }));
  // Away from Browser no page is read or sent.
  await page.evaluate(() => window.dispatchEvent(new Event('launcher-home')));
  const home = await ask(page, 'And now?', 2);
  expect(home.metadata.clientDevice.browserPage).toBeUndefined();
  expect(await reads(page)).toHaveLength(1);
  expect(await harness(page, f => f.unexpected)).toEqual([]);
  expect(foreign).toEqual([]);
});

test('an agent that does not declare browserPage gets the observation without the page', async ({ page }) => {
  test.setTimeout(120_000);
  await fenceNetwork(page);
  await flagOffAndroid(page);
  await nativeBrowser(page);
  await residentStub(page, { observationSupport: ['calendarDay', 'location'] });
  await residentHome(page);
  await openPage(page);
  const body = await ask(page, 'Summarize this page', 1);
  expect(body.metadata.clientDevice.context).toMatchObject({ view: 'browser' });
  expect(body.metadata.clientDevice.browserPage).toBeUndefined();
  expect(JSON.stringify(body)).not.toContain('Twelve boats');
});

test('a withheld page sends only its address and title', async ({ page }) => {
  test.setTimeout(120_000);
  await fenceNetwork(page);
  await flagOffAndroid(page);
  await nativeBrowser(page, { url: 'https://harbour-fixture.test/report', withheld: 'sensitive-page' });
  await residentStub(page, { observationSupport: ['browserPage'] });
  await residentHome(page);
  await openPage(page);
  const body = await ask(page, 'What is this page?', 1);
  expect(body.metadata.clientDevice.browserPage).toEqual(expect.objectContaining({ url: 'https://harbour-fixture.test/report', title: 'Harbour report', withheld: 'sensitive-page' }));
  expect(body.metadata.clientDevice.browserPage.text).toBeUndefined();
});

test('with Browser page for Alpha off, the page is neither read nor sent', async ({ page }) => {
  test.setTimeout(150_000);
  await fenceNetwork(page);
  await flagOffAndroid(page);
  await nativeBrowser(page);
  await residentStub(page, { observationSupport: ['browserPage'] });
  await residentHome(page);
  await button(page, 'Settings').click();
  await page.getByRole('button', { name: 'Privacy', exact: true }).click();
  const toggle = page.locator('[data-settings-page]:not([inert])').last().getByRole('switch', { name: 'Browser page for Alpha', exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await page.evaluate(() => window.dispatchEvent(new Event('launcher-home')));
  await openPage(page);
  const body = await ask(page, 'Summarize this page', 1);
  expect(body.metadata.clientDevice.browserPage).toBeUndefined();
  expect(await reads(page)).toEqual([]);
});
