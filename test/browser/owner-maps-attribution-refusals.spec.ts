import { returnToApps } from './app-navigation';
import { test, expect, type Page } from '@playwright/test';

const ATTRIBUTION = '© OpenStreetMap contributors (ODbL). Search: Nominatim. Routing: GraphHopper.';

type Refusal = { status: number; code: string; retryAfterSeconds?: number };

async function openMaps(page: Page) {
  await page.goto('/?mode=dev');
  await page.evaluate(async ({ attribution }) => {
    const { configureMapsProvider } = await import('/src/maps/runtime.ts');
    const { cloudMapsFailure } = await import('/src/maps/cloud-provider.ts');
    const { readServiceLimit } = await import('/src/runtime/subscription-entitlement.ts');
    const w = window as any;
    const point = { latitude: 43.7347, longitude: 7.4206 };
    const place = { providerId: 'eliza-cloud-osm', id: 'N1234', name: 'Port Hercule', coordinate: point, address: 'Port Hercule, Monaco', attribution, fetchedAt: Date.now() };
    const failure = (refusal: Refusal) => {
      const error = Object.assign(new Error(`Eliza Cloud http (${refusal.status})`), { name: 'CloudProtocolError', code: 'http', status: refusal.status,
        data: { code: refusal.code, ...(refusal.retryAfterSeconds ? { retryAfterSeconds: refusal.retryAfterSeconds } : {}) } });
      return cloudMapsFailure(error, undefined, readServiceLimit);
    };
    w.mapsRefusal = null; w.mapsSearches = 0;
    w.refusalMessage = (refusal: Refusal) => failure(refusal).message;
    configureMapsProvider({ status: 'configured', providerId: 'eliza-cloud-osm', connectionId: 'conn_eliza_cloud_maps_osm', revision: 'osm-monaco-2026-09-29',
      capabilities: { map: false, search: true, placeDetails: true, modes: ['drive', 'walk', 'bicycle'], traffic: 'none', transit: 'none', offline: { map: false, search: false, routing: false } } },
    { providerId: 'eliza-cloud-osm', connectionId: 'conn_eliza_cloud_maps_osm',
      search: async () => { w.mapsSearches++; if (w.mapsRefusal) throw failure(w.mapsRefusal); return [place]; },
      detail: async () => place,
      route: async () => { throw failure(w.mapsRefusal ?? { status: 503, code: 'provider_unavailable' }); } } as any);
  }, { attribution: ATTRIBUTION });
  await returnToApps(page);
  await page.getByRole('button', { name: 'Maps', exact: true }).click();
}

async function search(page: Page, text: string) {
  const before = await page.evaluate(() => (window as any).mapsSearches as number);
  const query = page.getByRole('searchbox', { name: 'Search places', exact: true });
  await query.fill(text);
  await query.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as any).mapsSearches as number)).toBeGreaterThan(before);
}

test('Maps keeps the OpenStreetMap copyright credit one tap away beside Cloud results', async ({ page }) => {
  await openMaps(page);
  await search(page, 'Port');
  await expect(page.getByRole('button', { name: /^Port Hercule/ }).first()).toBeVisible();
  await page.locator('.alpha-map-credits summary[aria-label="Map information and credits"]').click();
  const credit = page.locator('.alpha-map-credits a[href="https://www.openstreetmap.org/copyright"]');
  await expect(credit).toBeVisible();
  await expect(credit).toContainText(/OpenStreetMap/);
});

const REFUSALS: (Refusal & { text: RegExp })[] = [
  { status: 503, code: 'maps_allowance_unconfigured', text: /^Cloud Maps is not available yet\.$/ },
  { status: 403, code: 'subscription_required', text: /needs an active Cloud subscription/ },
  { status: 503, code: 'maps_not_configured', text: /^Cloud Maps is not available yet\.$/ },
  { status: 422, code: 'unsupported_region', text: /outside Cloud Maps coverage/ },
  { status: 429, code: 'rate_limited', retryAfterSeconds: 42, text: /Try again in about 42 seconds/ },
  { status: 429, code: 'allowance_exhausted', text: /used your Maps allowance/ },
  { status: 503, code: 'provider_unavailable', text: /temporarily unavailable/ },
];
test('each typed Cloud refusal is shown as its own message, with no invented result', async ({ page }) => {
  await openMaps(page);
  const shown = new Map<string, string>();
  for (const refusal of REFUSALS) {
    const { text, ...typed } = refusal;
    const expected = await page.evaluate(typed => (window as any).refusalMessage(typed) as string, typed);
    expect(expected, refusal.code).toMatch(text);
    await page.evaluate(typed => { (window as any).mapsRefusal = typed; }, typed);
    await search(page, `Port ${refusal.code}`);
    await expect(page.locator('[data-alpha-maps-status] [role="status"]'), refusal.code).toHaveText(expected);
    await expect(page.getByRole('button', { name: /^Port Hercule/ })).toHaveCount(0);
    shown.set(refusal.code, expected);
  }
  expect(shown.get('maps_not_configured')).toBe(shown.get('maps_allowance_unconfigured'));
  expect(new Set(shown.values()).size).toBe(REFUSALS.length - 1);
});
