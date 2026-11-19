// "Directions to <place>" from the chat, with the chat full or as a sheet over Home, Phone and
// Browser, on the flag-off Android renderer. On the owner's Pixel (v612, 2026-11-18) this
// replied "Maps could not be shown on the phone right now. Nothing was changed on the map."
// with Phone in front: the agent asked the phone to start navigation, and the launcher's Maps
// surface refused because Phone was a view an agent request never replaced. The relay then
// dropped the phone's own reason and the agent host answered with its generic text.
//
// The agent host's half of the Maps navigation relay is a bridge stub below: it holds the reply,
// delivers one MAPS_NAVIGATION_START request ("start", Coit Tower, drive) to the phone's poll,
// and records the phone's result. The phone's half (resident-relay.ts, the shared relay loop,
// DeviceMapsNavigation, the Maps adapter's present check and the Maps screen) is the shipped
// renderer. Cloud Maps is resident-stub `maps`; ElizaLocation is a stub fix stream.
//
// Evidence boundary: source/test evidence for the flag-off renderer only. No model, agent host,
// Cloud Maps service, GPS, APK, emulator or device is involved.
import { test, expect, type Page } from '@playwright/test';
test.use({ locale: 'en-GB' });
import { flagOffAndroid, button, harness, fenceNetwork, residentHome } from './flag-off-android';
import { residentStub, setStub, type StubMaps } from './resident-stub';

const COIT = { id: 'N3001', name: 'Coit Tower', latitude: 37.8024, longitude: -122.4058, address: '1 Telegraph Hill Blvd, San Francisco' };
const HERE = { latitude: 37.7955, longitude: -122.3937 };
const MAPS: StubMaps = {
  regions: [{ id: 'sf', name: 'San Francisco', bounds: [-122.52, 37.7, -122.35, 37.83] }],
  places: { 'Coit Tower': [COIT] },
  routes: [{ minutes: 9, meters: 2100, via: 'Columbus Avenue' }],
};
type Relay = { phases: string[]; results: any[]; deliver: boolean };

/** The agent host's relay, AlphaTelephony for the Phone view, and a location stream. */
async function devicePorts(page: Page, options: { fix: boolean }) {
  await page.addInitScript(({ coit, here, fix }) => {
    const w = window as any, base = w.Capacitor, f = w.flagOff;
    const relay: Relay = w.navRelay = { phases: [], results: [], deliver: false };
    const listeners = [{ name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'callback' }];
    const promise = (names: string[]) => names.map(name => ({ name, rtype: 'promise' }));
    base.PluginHeaders.push(
      { name: 'ElizaLocation', methods: [...promise(['checkPermissions', 'requestPermissions', 'cancelPermissionRequest', 'watchPosition', 'clearWatch']), ...listeners] },
      { name: 'AlphaMapsTransport', methods: [...promise(['navigationAvailability', 'startNavigation', 'updateNavigation', 'stopNavigation']), ...listeners] },
      // The Alpha AOSP image's plugin: its presence is what admits the Phone view.
      { name: 'AlphaTelephony', methods: [...promise(['imageCapability', 'status', 'listRecentCalls', 'voicemailStatus', 'listVoicemail', 'callState', 'ongoingCall']), ...listeners] },
    );
    let sequence = 0;
    const native = base.nativePromise;
    base.nativePromise = async (plugin: string, method: string, input: any) => {
      if (plugin === 'ElizaLocation') {
        if (method === 'checkPermissions' || method === 'requestPermissions') return fix ? { location: 'granted', accuracy: 'precise' } : { location: 'denied', accuracy: 'none' };
        if (method === 'watchPosition') {
          const watchId = 'watch-' + ++sequence;
          if (fix) setTimeout(() => f.emit('ElizaLocation', 'locationChange', { coords: { ...here, accuracy: 5, timestamp: Date.now(), heading: null, speed: null }, cached: false }), 50);
          return { watchId };
        }
        return {};
      }
      // The renderer abandoning the reply's stream (it also ends a finished one).
      if (plugin === 'Agent' && method === 'cancelStream') relay.phases.push('cancel');
      if (plugin === 'AlphaMapsTransport') return method === 'navigationAvailability' ? { background: true, activeSessionId: null } : {};
      if (plugin === 'AlphaTelephony') {
        if (method === 'imageCapability') return { version: 1, image: true, feature: 'fixture.image' };
        // No call log, voicemail or call: the Phone view shows its empty dialer.
        if (method === 'status') return { version: 2, voiceCapable: true, smsCapable: false, permissions: { contacts: 'prompt', phoneState: 'prompt', sms: 'prompt', sendSms: 'prompt', callLog: 'prompt' }, sendMode: 'handoff', mmsSend: false,
          roles: { dialer: { available: true, held: true, eligible: true }, sms: { available: true, held: false, eligible: true } }, defaultDialer: 'ai.alphacompute.alphaphone', defaultSms: 'com.android.messaging', subscriptions: null, defaultSmsSubscriptionId: null };
        return {};
      }
      if (plugin === 'Agent' && method === 'request' && input.path === '/api/client-devices/maps-navigation') {
        const body = JSON.parse(input.body);
        relay.phases.push(body.phase);
        const ok = (data: unknown) => ({ status: 200, body: JSON.stringify(data) });
        if (body.phase === 'poll' && relay.deliver) {
          relay.deliver = false;
          const delivered = crypto.randomUUID();
          return ok({ protocol: 1, request: { id: delivered, expiresAt: Date.now() + 30_000, operation: { kind: 'start', request: {
            destination: { provider: 'eliza-cloud', providerPlaceId: coit.id, name: coit.name, coordinates: { latitude: coit.latitude, longitude: coit.longitude }, formattedAddress: coit.address, categories: [] },
            travelMode: 'drive' } } } });
        }
        if (body.phase === 'poll') { await new Promise(resolve => setTimeout(resolve, 100)); return ok({ protocol: 1, request: null }); }
        if (body.phase === 'result') {
          relay.results.push(body.failed ? { failed: body.failed } : { status: body.status });
          // The agent words its reply after the phone answers; Maps keeps settling meanwhile.
          setTimeout(() => { relay.phases.push('reply'); w.residentStub.release?.(); }, 1500);
        }
        return ok({ protocol: 1, request: null });
      }
      return native(plugin, method, input);
    };
  }, { coit: COIT, here: HERE, fix: options.fix });
}

const relay = (page: Page) => page.evaluate(() => (window as any).navRelay as Relay);
const composer = (page: Page) => page.locator('[data-alpha-layer="composer"][aria-hidden="false"], [data-alpha-layer="conversation"][aria-hidden="false"]').getByRole('textbox').first();

/** Opens `app` from Home, sets the chat to `chat` over it, and asks for directions to Coit Tower. */
async function ask(page: Page, app: 'Home' | 'Phone' | 'Browser', chat: 'full' | 'sheet') {
  await page.evaluate(() => window.dispatchEvent(new Event('launcher-home')));
  await expect(page.locator('html')).toHaveAttribute('data-active-view', 'home');
  if (app !== 'Home') {
    await button(page, app).click();
    await expect(page.locator('html')).toHaveAttribute('data-active-view', app.toLowerCase());
  }
  if (!await page.getByRole('button', { name: 'Expand chat', exact: true }).isVisible() && !await page.getByRole('button', { name: 'Shrink chat', exact: true }).isVisible()) {
    // Phone rests on its "Call or ask" bar, with no pill; the Android assist gesture opens the conversation anywhere.
    if (await page.getByRole('button', { name: 'Open conversation', exact: true }).isVisible()) await button(page, 'Open conversation').click();
    else await harness(page, f => f.emit('DailyApps', 'assistantInvoked'));
  }
  if (chat === 'full' && await page.getByRole('button', { name: 'Expand chat', exact: true }).isVisible()) await button(page, 'Expand chat').click();
  if (chat === 'sheet' && await page.getByRole('button', { name: 'Shrink chat', exact: true }).isVisible()) await button(page, 'Shrink chat').click();
  await expect(page.getByRole('button', { name: chat === 'full' ? 'Shrink chat' : 'Expand chat', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-active-view', app.toLowerCase());
  await page.evaluate(() => { const r = (window as any).navRelay; r.results = []; r.phases = []; r.deliver = true; });
  await setStub(page, { stream: 'hold' });
  await composer(page).fill('directions to Coit Tower');
  await composer(page).press('Enter');
}

for (const chat of ['full', 'sheet'] as const) {
  test(`directions to a place open Maps with the route from the phone's fix, chat ${chat} over Home, Phone and Browser`, async ({ page }) => {
    test.setTimeout(240_000);
    const foreign = await fenceNetwork(page);
    await flagOffAndroid(page);
    await residentStub(page, { maps: MAPS });
    await devicePorts(page, { fix: true });
    await residentHome(page);
    for (const app of ['Home', 'Phone', 'Browser'] as const) {
      await test.step(`${app}, chat ${chat}`, async () => {
        await ask(page, app, chat);
        await expect.poll(async () => (await relay(page)).results, { timeout: 30_000 }).toEqual([{ status: { state: 'awaiting-confirmation', placeName: 'Coit Tower', travelMode: 'drive' } }]);
        await expect(page.locator('html')).toHaveAttribute('data-active-view', 'maps');
        await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
        // Opening Maps was the turn's own move: the reply is still open when the agent sends it.
        await expect.poll(async () => (await relay(page)).phases.filter(phase => phase === 'reply' || phase === 'cancel')[0], { timeout: 10_000 }).toBe('reply');
        // Maps is the screen in front: the chat rests below it, not over the route.
        await expect(page.getByRole('button', { name: 'Shrink chat', exact: true })).toHaveCount(0);
      });
    }
    expect(foreign).toEqual([]);
  });
}

test('with no location fix, directions from the chat over Phone still open Maps on the destination and say so', async ({ page }) => {
  test.setTimeout(120_000);
  const foreign = await fenceNetwork(page);
  await flagOffAndroid(page);
  await residentStub(page, { maps: MAPS });
  await devicePorts(page, { fix: false });
  await residentHome(page);
  await ask(page, 'Phone', 'full');
  // Upstream's reply to awaiting-location asks for a starting place; it never says Maps could not be shown.
  await expect.poll(async () => (await relay(page)).results, { timeout: 30_000 }).toEqual([{ status: { state: 'awaiting-location', placeName: 'Coit Tower', travelMode: 'drive' } }]);
  await expect(page.locator('html')).toHaveAttribute('data-active-view', 'maps');
  await expect(page.getByRole('textbox', { name: 'Starting point' })).toBeVisible();
  expect(foreign).toEqual([]);
});
