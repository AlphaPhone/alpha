import {test, expect, type Locator, type Page} from '@playwright/test';

// VIS-14: the assistant dock stays on full-bleed views (Camera, Maps, the photo viewer), so each
// view lays out its own bottom controls above the dock's measured footprint. A long draft makes
// the dock taller; the controls must move with it rather than slide underneath.
test.use({hasTouch: true, isMobile: true, viewport: {width: 412, height: 915}});

type Box = {x: number; y: number; width: number; height: number};
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** The visible boxes of the assistant dock: the input bar and the pill. */
function dockBoxes(page: Page) {
  return page.evaluate(() => [...document.querySelectorAll('[data-alpha-layer="composer"] *, [data-alpha-layer="pill"] *')]
    .filter(element => {
      const box = element.getBoundingClientRect(), style = getComputedStyle(element);
      return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && Number(style.opacity) > 0 && !element.closest('[aria-hidden="true"],[inert]');
    })
    .map(element => { const {x, y, width, height} = element.getBoundingClientRect(); return {x, y, width, height}; }));
}

/** Recenter animates its `bottom` (.45s) and the dock reserve is measured after layout, so wait for both to settle. */
async function expectClearOfDock(page: Page, controls: Locator[]) {
  await expect(async () => checkClearOfDock(page, controls)).toPass({timeout: 5000});
}

async function checkClearOfDock(page: Page, controls: Locator[]) {
  const dock = await dockBoxes(page);
  expect(dock.length).toBeGreaterThan(0);
  for (const control of controls) {
    await expect(control).toBeInViewport({ratio: 0.9999});
    const box = (await control.boundingBox())!;
    expect(dock.filter(part => overlaps(box, part)), await control.evaluate(e => e.outerHTML.slice(0, 80))).toEqual([]);
    // Nothing else, including another of the view's own controls, is drawn over its center. While the
    // dock holds a draft, a transparent scrim catches the first outside tap to lower the dock without
    // activating what it uncovers; that is deliberate and draws nothing, so it is skipped here.
    expect(await control.evaluate(element => {
      const box = element.getBoundingClientRect();
      const hit = document.elementsFromPoint(box.x + box.width / 2, box.y + box.height / 2)
        .find(item => !item.matches('[data-alpha-chat-scrim][data-alpha-dock-scrim="true"]'));
      return element.contains(hit ?? null) || hit?.outerHTML.slice(0, 120);
    })).toBe(true);
  }
}

/** Type a six-line draft so the dock grows, then leave the field. */
async function growDock(page: Page) {
  const before = (await dockBoxes(page)).reduce((top, part) => Math.min(top, part.y), Infinity);
  await page.getByRole('button', {name: 'Type', exact: true}).click();
  const field = page.locator('[data-alpha-layer="composer"] textarea');
  await field.fill('one\ntwo\nthree\nfour\nfive\nsix');
  await field.blur();
  await expect.poll(async () => (await dockBoxes(page)).reduce((top, part) => Math.min(top, part.y), Infinity)).toBeLessThan(before - 80);
}

async function offline(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('alpha.connection.selection.v1', JSON.stringify({kind: 'offline'}));
    const w = window as any; w.geoWatchId = 0;
    Object.defineProperty(navigator, 'permissions', {value: {query: async () => ({state: 'granted'})}});
    Object.defineProperty(navigator, 'geolocation', {value: {watchPosition: (fn: any) => { w.geoFix = fn; return ++w.geoWatchId; }, clearWatch: () => {}}});
    navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Fixture has no hardware camera', 'NotFoundError'); };
  });
}

async function configureFixtureMaps(page: Page) {
  await page.evaluate(async () => {
    const {configureMapsProvider} = await import('/src/maps/runtime.ts' as string);
    const place = {providerId: 'fixture-region', id: 'destination', name: 'Test destination', coordinate: {latitude: 43.741, longitude: 7.424}, attribution: 'Fixture attribution', fetchedAt: Date.now()};
    configureMapsProvider({status: 'configured', providerId: 'fixture-region', connectionId: 'conn_fixture_region_123456', revision: 'fixture1',
      capabilities: {map: false, search: true, placeDetails: true, modes: ['drive'], traffic: 'none', transit: 'none', offline: {map: false, search: false, routing: false}}},
    {providerId: 'fixture-region', connectionId: 'conn_fixture_region_123456', search: async () => [place], detail: async () => place,
      route: async (from: any, to: any, mode: any) => ({providerId: 'fixture-region', id: 'route', from, to, mode, geometry: [from, {latitude: 43.739, longitude: 7.424}, to], distanceMeters: 333, durationSeconds: 223,
        steps: [{instruction: 'Start here', coordinate: from, distanceMeters: 0}, {instruction: 'Turn right', coordinate: {latitude: 43.739, longitude: 7.424}, distanceMeters: 111}, {instruction: 'Continue to destination', coordinate: to, distanceMeters: 222}],
        attribution: 'Fixture attribution', fetchedAt: Date.now(), traffic: 'none'})});
  });
}

async function startGuidance(page: Page) {
  const search = page.getByRole('searchbox', {name: 'Search places'});
  await search.fill('Test destination'); await search.press('Enter');
  await page.getByRole('button', {name: /^Test destination/}).first().click();
  await page.getByRole('button', {name: 'Directions', exact: true}).click();
  const origin = page.getByRole('textbox', {name: 'Starting point'});
  await origin.fill('43.738, 7.424'); await origin.press('Enter');
  await expect(page.getByText(/no live traffic/).first()).toBeVisible();
  const watches = await page.evaluate(() => (window as any).geoWatchId);
  await page.getByRole('button', {name: 'Start', exact: true}).click();
  await expect.poll(() => page.evaluate(() => (window as any).geoWatchId)).toBeGreaterThan(watches);
  await page.evaluate(() => (window as any).geoFix({coords: {latitude: 43.738, longitude: 7.424, accuracy: 5}, timestamp: Date.now()}));
  await expect(page.locator('[data-alpha-maps-guidance-controls]')).toBeVisible();
  // Guidance offers Recenter once the owner moves the map away from the followed position.
  const recenter = page.getByRole('button', {name: 'Recenter', exact: true});
  await expect(recenter).toHaveCount(0);
  const plane = (await page.locator('[data-alpha-map-plane]').boundingBox())!;
  const x = plane.x + plane.width / 2, y = plane.y + plane.height * 0.45;
  await page.mouse.move(x, y); await page.mouse.down();
  for (let step = 1; step <= 8; step++) await page.mouse.move(x + step * 12, y + step * 6);
  await page.mouse.up();
  await expect(recenter).toBeVisible();
}

test('Camera keeps its capture controls above the dock as the dock grows', async ({page}, info) => {
  await offline(page);
  await page.goto('/?mode=dev');
  await page.getByRole('button', {name: 'Camera', exact: true}).click();
  const root = page.locator('[data-alpha-camera-root]');
  await expect(root).toBeVisible();
  const controls = ['Photo mode', 'Video mode', 'Take photo'].map(name => root.getByRole('button', {name, exact: true}));
  await expectClearOfDock(page, controls);
  await growDock(page);
  await expectClearOfDock(page, controls);
  await page.screenshot({path: info.outputPath('camera-tall-dock.png'), animations: 'disabled'});
});

test('Maps base map keeps Recenter and credits above the dock as the dock grows', async ({page}, info) => {
  await offline(page);
  await page.goto('/?mode=dev');
  await page.getByRole('button', {name: 'Maps', exact: true}).click();
  const root = page.locator('[data-alpha-maps-root]');
  await expect(root).toHaveAttribute('data-alpha-maps-base', 'true');
  const controls = [root.getByRole('button', {name: 'Recenter', exact: true}), root.locator('.alpha-map-credits')];
  await expectClearOfDock(page, controls);
  await growDock(page);
  await expectClearOfDock(page, controls);
  await page.screenshot({path: info.outputPath('maps-base-tall-dock.png'), animations: 'disabled'});
});

for (const viewport of [{width: 412, height: 915}, {width: 915, height: 412}]) {
  test(`Maps guidance stacks Recenter, credits and End above the dock at ${viewport.width}x${viewport.height}`, async ({page}, info) => {
    await page.setViewportSize(viewport);
    await offline(page);
    await page.goto('/?mode=dev');
    await configureFixtureMaps(page);
    await page.getByRole('button', {name: 'Maps', exact: true}).click();
    await startGuidance(page);
    const root = page.locator('[data-alpha-maps-root]');
    const guidance = root.locator('[data-alpha-maps-guidance-controls]');
    const recenter = root.getByRole('button', {name: 'Recenter', exact: true});
    const credits = root.locator('.alpha-map-credits');
    const controls = [recenter, credits, guidance.getByRole('button', {name: 'End navigation', exact: true})];
    const separate = async () => {
      const [a, b, c] = await Promise.all([recenter, credits, guidance].map(item => item.boundingBox()));
      expect(overlaps(a!, c!)).toBe(false);
      expect(overlaps(b!, c!)).toBe(false);
      expect(overlaps(a!, b!)).toBe(false);
    };
    await expectClearOfDock(page, controls);
    await separate();
    if (viewport.height > viewport.width) {
      await growDock(page);
      await expectClearOfDock(page, controls);
      await separate();
    }
    await page.screenshot({path: info.outputPath(`maps-guidance-${viewport.width}x${viewport.height}.png`), animations: 'disabled'});
  });
}

test('the photo viewer keeps its actions above the dock as the dock grows', async ({page}, info) => {
  await offline(page);
  await page.goto('/?mode=dev');
  await page.evaluate(async () => {
    const {browserPhotoLibrary: library} = await import('/src/prototype/browser-camera.ts' as string);
    await library.list();
    const canvas = document.createElement('canvas'); canvas.width = 240; canvas.height = 120;
    const context = canvas.getContext('2d')!; context.fillStyle = '#2c4'; context.fillRect(0, 0, 240, 120);
    const photo = {id: '1000', kind: 'image', image: canvas.toDataURL('image/jpeg', .9), width: 240, height: 120, date: 1700000000000, revision: 'original-pixels', mutationRevision: 'original-metadata', favorite: false, trashed: false};
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('alpha.browser.photos.v1');
      request.onsuccess = () => { const db = request.result, tx = db.transaction('photos', 'readwrite'); tx.objectStore('photos').add(photo); tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => reject(tx.error); };
      request.onerror = () => reject(request.error);
    });
  });
  await page.reload();
  await page.getByRole('button', {name: 'Photos', exact: true}).click();
  await page.getByRole('button', {name: /^Photo, /}).click();
  const actions = page.locator('[data-alpha-photo-actions] button').filter({visible: true});
  await expect(actions.first()).toBeVisible();
  const controls = await actions.all();
  expect(controls.length).toBeGreaterThan(1);
  await expectClearOfDock(page, controls);
  await growDock(page);
  await expectClearOfDock(page, controls);
  await page.screenshot({path: info.outputPath('photo-viewer-tall-dock.png'), animations: 'disabled'});
});
