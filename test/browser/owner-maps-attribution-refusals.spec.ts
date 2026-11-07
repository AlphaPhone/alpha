import { returnToApps } from './app-navigation';
import { test, expect, type Page } from '@playwright/test';

// Owner prep for #667 (H-16, H-35). Test-mocks renderer with a synthetic Cloud Maps provider: the
// real Maps screen, the real Cloud failure mapping (cloudMapsFailure) and no network provider.
// It shows what Alpha renders for OpenStreetMap credit and for each typed Cloud Maps refusal. It is
// not evidence of a deployed Cloud Maps service, real coverage or a device.

const ATTRIBUTION = '© OpenStreetMap contributors (ODbL). Search: Nominatim. Routing: GraphHopper.';

type Refusal = { status: number; code: string; retryAfterSeconds?: number };

// The provider throws whichever refusal window.mapsRefusal names at the time of the search, so
// one boot can show every code in turn.
async function openMaps(page: Page, refusal: Refusal | null) {
  await page.goto('/?mode=dev');
  await page.evaluate(async ({ refusal, attribution }) => {
    const { configureMapsProvider } = await import('/src/maps/runtime.ts');
    const { cloudMapsFailure } = await import('/src/maps/cloud-provider.ts');
    const { readServiceLimit } = await import('/src/runtime/subscription-entitlement.ts');
    const w = window as any;
    w.mapsRefusal = refusal; w.mapsSearches = 0;
    const point = { latitude: 43.7347, longitude: 7.4206 };
    const place = { providerId: 'eliza-cloud-osm', id: 'N1234', name: 'Port Hercule', coordinate: point, address: 'Port Hercule, Monaco', attribution, fetchedAt: Date.now() };
    const failure = (refusal: Refusal) => {
      const error = Object.assign(new Error(`Eliza Cloud http (${refusal.status})`), { name: 'CloudProtocolError', code: 'http', status: refusal.status,
        data: { code: refusal.code, ...(refusal.retryAfterSeconds ? { retryAfterSeconds: refusal.retryAfterSeconds } : {}) } });
      return cloudMapsFailure(error, undefined, readServiceLimit);
    };
    configureMapsProvider({ status: 'configured', providerId: 'eliza-cloud-osm', connectionId: 'conn_eliza_cloud_maps_osm', revision: 'osm-monaco-2026-09-29',
      capabilities: { map: false, search: true, placeDetails: true, modes: ['drive', 'walk', 'bicycle'], traffic: 'none', transit: 'none', offline: { map: false, search: false, routing: false } } },
    { providerId: 'eliza-cloud-osm', connectionId: 'conn_eliza_cloud_maps_osm',
      search: async () => { w.mapsSearches++; if (w.mapsRefusal) throw failure(w.mapsRefusal); return [place]; },
      detail: async () => place,
      route: async () => { throw failure(w.mapsRefusal ?? { status: 503, code: 'provider_unavailable' }); } } as any);
  }, { refusal, attribution: ATTRIBUTION });
  await returnToApps(page);
  await page.getByRole('button', { name: 'Maps', exact: true }).click();
  await search(page, 'Port');
}

async function search(page: Page, text: string) {
  const query = page.getByRole('textbox', { name: 'Search places', exact: true });
  await query.fill(text);
  await query.press('Enter');
}

test('Maps keeps the OpenStreetMap copyright credit visible beside Cloud results', async ({ page }) => {
  await openMaps(page, null);
  await expect(page.getByRole('button', { name: /^Port Hercule/ }).first()).toBeVisible();
  const credit = page.locator('.alpha-map-credits a[href="https://www.openstreetmap.org/copyright"]');
  await expect(credit).toBeVisible();
  await expect(credit).toContainText(/OpenStreetMap/);
});

// Each code's own message. maps_allowance_unconfigured and maps_not_configured are the same
// state for the owner (Cloud has not set Maps up), so they share one message; every other code
// must read differently.
const NOT_CONFIGURED = /^Cloud Maps is not available yet\.$/;
const REFUSALS: (Refusal & { text: RegExp })[] = [
  { status: 503, code: 'maps_allowance_unconfigured', text: NOT_CONFIGURED },
  { status: 503, code: 'maps_not_configured', text: NOT_CONFIGURED },
  { status: 403, code: 'subscription_required', text: /^Maps needs an active Cloud subscription\.$/ },
  { status: 422, code: 'unsupported_region', text: /^This location is outside Cloud Maps coverage\.$/ },
  { status: 429, code: 'rate_limited', retryAfterSeconds: 42, text: /^Maps request limit reached\. Try again in about 42 seconds\.$/ },
  { status: 429, code: 'allowance_exhausted', text: /^You have used your Maps allowance for this period\./ },
  { status: 503, code: 'provider_unavailable', text: /^Cloud Maps is temporarily unavailable\. Try again later\.$/ },
];
test('each typed Cloud refusal is shown as its own message, with no invented result', async ({ page }) => {
  const status = page.locator('[data-alpha-maps-status] [role="status"]');
  const shown: string[] = [];
  for (const [index, refusal] of REFUSALS.entries()) {
    const { text, ...thrown } = refusal;
    if (index === 0) await openMaps(page, thrown);
    else {
      await page.evaluate(refusal => { (window as any).mapsRefusal = refusal; }, thrown);
      await search(page, `Port ${refusal.code}`);
    }
    await expect.poll(() => page.evaluate(() => (window as any).mapsSearches), { message: refusal.code }).toBe(index + 1);
    await expect(status, refusal.code).toHaveText(text);
    await expect(page.getByRole('button', { name: /^Port Hercule/ })).toHaveCount(0);
    shown.push((await status.textContent())!.trim());
  }
  const [allowanceUnconfigured, notConfigured, ...distinct] = shown;
  expect(notConfigured).toBe(allowanceUnconfigured);
  expect(new Set([allowanceUnconfigured, ...distinct]).size).toBe(distinct.length + 1);
});
