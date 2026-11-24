import { test, expect } from '@playwright/test';
import { auditPage, auditReadingOrder, auditTabOrder, auditTree, exposedTabStopBudget, format, blocking } from './accessibility-audit';
import { BROWSER_APP_STATES, CONNECTED_STATES, DEVELOPMENT_STATES, FAILURE_STATES, FIXTURE_STATES, LAUNCHER_STATES, LIVE_STATES, MOCK_STATES, setTextScale } from './accessibility-states';
import { settled } from './helpers/settled';

test.describe.configure({ mode: 'parallel' });

const STATES = [...LIVE_STATES, ...BROWSER_APP_STATES, ...DEVELOPMENT_STATES, ...MOCK_STATES, ...CONNECTED_STATES, ...FAILURE_STATES];
const LARGE_TEXT_TIMEOUT = 90_000;

for (const theme of ['light', 'dark'] as const) {
  for (const state of STATES) {
    test(`names, roles, focus and contrast: ${state.name} (${theme})`, async ({ page }) => {
      test.setTimeout(60_000);
      await state.open(page, theme);
      const found = format([
        ...await auditTree(page),
        ...await auditPage(page, { contrast: true, targetSize: 24, clipping: true, overlap: true, dock: true }),
        ...await auditTabOrder(page, state.name==='live Settings licenses'?await exposedTabStopBudget(page):undefined),
        ...theme === 'light' ? await auditReadingOrder(page) : [],
      ]);
      expect(blocking(found), blocking(found).join('\n')).toEqual([]);
    });
  }
}

for (const state of STATES) {
  test(`200% text is not clipped and does not overlap: ${state.name}`, async ({ page }, info) => {
    test.setTimeout(LARGE_TEXT_TIMEOUT);
    await state.open(page, 'light');
    await setTextScale(page, 2);
    const found = format(await auditPage(page, { clipping: true, overlap: true, dock: true }));
    await info.attach('truncated', { body: found.filter(line => line.startsWith('text-truncated:')).join('\n') || 'none', contentType: 'text/plain' });
    expect(blocking(found), blocking(found).join('\n')).toEqual([]);
    const tree = format(await auditTree(page));
    expect(tree, tree.join('\n')).toEqual([]);
    const focus = format(await auditTabOrder(page, state.name==='live Settings licenses'?await exposedTabStopBudget(page):undefined));
    expect(focus, focus.join('\n')).toEqual([]);
    const order = format(await auditReadingOrder(page));
    expect(order, order.join('\n')).toEqual([]);
  });
}

const OPEN_AT_300 = new Set([
]);
for (const state of [...LIVE_STATES, ...BROWSER_APP_STATES, ...LAUNCHER_STATES]) {
  test(`300% text (largest in-app size and system font) is not clipped and does not overlap: ${state.name}`, async ({ page }) => {
    test.setTimeout(LARGE_TEXT_TIMEOUT);
    await state.open(page, 'light');
    await setTextScale(page, 3);
    const found = blocking(format([...await auditPage(page, { clipping: true, overlap: true, dock: true }), ...await auditTree(page), ...await auditTabOrder(page, state.name==='live Settings licenses'?await exposedTabStopBudget(page):undefined), ...await auditReadingOrder(page)]));
    if (OPEN_AT_300.has(state.name)) expect(found, `${state.name} now passes at 300%: remove it from OPEN_AT_300 (issue #701)`).not.toEqual([]);
    else expect(found, found.join('\n')).toEqual([]);
  });
}
test('300% text keeps the widest month name whole in the launcher Calendar header', async ({ page }) => {
  test.setTimeout(LARGE_TEXT_TIMEOUT);
  await page.clock.setFixedTime(new Date('2026-09-15T12:00:00'));
  await LAUNCHER_STATES.find(state => state.name === 'launcher Calendar')!.open(page, 'light');
  await setTextScale(page, 3);
  await expect(page.getByRole('heading', { name: 'September', exact: true })).toBeVisible();
  const found = blocking(format([...await auditPage(page, { clipping: true, overlap: true, dock: true }), ...await auditTree(page)]));
  expect(found, found.join('\n')).toEqual([]);
});

test.describe('landscape', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 915, height: 412 } });
  for (const state of STATES) {
    test(`landscape keeps every control on screen: ${state.name}`, async ({ page }) => {
      test.setTimeout(LARGE_TEXT_TIMEOUT);
      await state.open(page, 'light');
      await expect(page.locator('html')).toHaveClass(/alpha-landscape/);
      const found = blocking(format([...await auditPage(page, { clipping: true, overlap: true, dock: true }), ...await auditTree(page), ...await auditTabOrder(page, state.name==='live Settings licenses'?await exposedTabStopBudget(page):undefined), ...await auditReadingOrder(page)]));
      expect(blocking(found), blocking(found).join('\n')).toEqual([]);
    });
  }
  for (const state of STATES) {
    test(`landscape at 200% text keeps every control on screen: ${state.name}`, async ({ page }) => {
      test.setTimeout(LARGE_TEXT_TIMEOUT);
      await state.open(page, 'light');
      await expect(page.locator('html')).toHaveClass(/alpha-landscape/);
      await setTextScale(page, 2);
      const found = blocking(format([...await auditPage(page, { clipping: true, overlap: true, dock: true }), ...await auditTree(page), ...await auditTabOrder(page, state.name==='live Settings licenses'?await exposedTabStopBudget(page):undefined), ...await auditReadingOrder(page)]));
      expect(found, found.join('\n')).toEqual([]);
    });
  }
});

for (const state of [...FIXTURE_STATES, ...LAUNCHER_STATES]) {
  for (const scale of [1, 2]) {
    test(`${scale * 100}% text, names, focus and contrast: ${state.name}`, async ({ page }) => {
      test.setTimeout(LARGE_TEXT_TIMEOUT);
      await state.open(page, 'light');
      if (scale !== 1) await setTextScale(page, scale);
      if (state.name === 'launcher Home' && scale === 2) {
        await expect(page.getByRole('status', { name: 'Assistant draft status' })).toBeVisible();
        await settled(page);
      }
      const found = blocking(format([
        ...await auditTree(page),
        ...await auditPage(page, scale === 1 ? { contrast: true, targetSize: 24, clipping: true, overlap: true, dock: true } : { clipping: true, overlap: true, dock: true }),
        ...await auditTabOrder(page, state.name==='live Settings licenses'?await exposedTabStopBudget(page):undefined),
        ...await auditReadingOrder(page),
      ]));
      expect(found, found.join('\n')).toEqual([]);
    });
  }
}

test('launcher Apps keeps scroll clearance when a late draft status arrives', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const waiting = new MutationObserver(() => {
      const dock = document.querySelector<HTMLElement>('[data-alpha-layer="composer"]');
      if (!dock) return;
      waiting.disconnect();
      const status = new MutationObserver(() => {
        const list = document.querySelector<HTMLElement>('[data-alpha-layer="drawer"] [data-installed-apps-scroll]');
        const clock = list?.querySelector<HTMLElement>('[aria-label="Open Synthetic clock"]');
        if (!list || !clock || !dock.textContent?.includes('Local draft could not be read')) return;
        const box = clock.getBoundingClientRect(), dockBox = dock.getBoundingClientRect();
        const screen = document.querySelector<HTMLElement>('[data-screen]')!;
        const scale = screen.getBoundingClientRect().width / screen.offsetWidth;
        (window as any).__alphaLateDockLayout = {
          room: (list.scrollHeight - list.clientHeight - list.scrollTop) * scale,
          need: box.bottom - dockBox.top,
        };
        status.disconnect();
      });
      status.observe(document.body, { childList: true, subtree: true, characterData: true });
    });
    waiting.observe(document, { childList: true, subtree: true });
  });
  await LAUNCHER_STATES.find(state => state.name === 'launcher Apps')!.open(page, 'light');
  await expect.poll(() => page.evaluate(() => (window as any).__alphaLateDockLayout)).toBeTruthy();
  const layout = await page.evaluate(() => (window as any).__alphaLateDockLayout as { room: number; need: number });
  await info.attach('late-draft-status-layout', { body: JSON.stringify(layout), contentType: 'application/json' });
  expect(layout.room).toBeGreaterThanOrEqual(layout.need);
  expect(errors).toEqual([]);
});

test('200% text: a row added to the launcher composer is in the published clearance at once', async ({ page }) => {
  await LAUNCHER_STATES.find(state => state.name === 'launcher Home')!.open(page, 'light');
  await setTextScale(page, 2);
  const result = await page.evaluate(() => new Promise<{ published: string; measured: number }>(resolve => {
    const dock = document.querySelector<HTMLElement>('[data-alpha-layer="composer"]')!;
    const screen = document.querySelector<HTMLElement>('[data-screen]')!;
    const covered = () => {
      let top = 0;
      let node: HTMLElement | null = dock;
      for (; node && node !== screen; node = node.offsetParent as HTMLElement | null) top += node.offsetTop;
      return screen.clientHeight - top;
    };
    const checkpoint = new MutationObserver(() => {
      checkpoint.disconnect();
      resolve({ published: getComputedStyle(document.documentElement).getPropertyValue('--alpha-dock-clearance').trim(), measured: Math.ceil(covered()) });
    });
    checkpoint.observe(document.body, { childList: true, subtree: true, attributes: true });
    const row = document.createElement('div');
    row.setAttribute('role', 'status');
    row.style.cssText = 'font-size:12px;line-height:1.5;padding:6px 16px';
    row.textContent = 'Local draft could not be read. Your current text is retained.';
    dock.prepend(row);
  }));
  expect(result.published).toBe(`${result.measured}px`);
});

test('200% text survives the browser build re-applying its stored text size', async ({ page }) => {
  await page.goto('/?mode=mock&start=maps:route');
  await setTextScale(page, 2);
  await page.evaluate(() => window.dispatchEvent(new Event('alpha:device-settings')));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--alpha-text-scale').trim())).toBe('2');
});

for (const theme of ['light', 'dark'] as const) {
  test(`shared Home tiles are counted, named and reachable: ${theme}`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('alpha.connection.selection.v1', JSON.stringify({ kind: 'offline' })));
    await page.goto('/?mode=dev&theme=' + theme);
    const home = page.getByRole('region', { name: 'Home', exact: true });
    const grid = home.locator('[data-mobile-shell-apps]');
    await expect(grid.locator('[data-mobile-shell-tile]').first()).toBeVisible();
    const tiles = await grid.locator('[data-mobile-shell-tile]').evaluateAll(elements => elements.map(element => ({
      tag: element.tagName, type: element.getAttribute('type'), name: element.getAttribute('aria-label'),
      label: element.querySelector('[data-mobile-shell-tile-label]')?.textContent ?? '',
      icon: element.getAttribute('data-mobile-shell-tile-icon'), image: !!element.querySelector('img'),
    })));
    expect(tiles.length).toBe(await grid.getByRole('button').count());
    expect(tiles.length, 'product tiles and Apps').toBeGreaterThan(1);
    for (const tile of tiles) {
      expect(tile).toMatchObject({ tag: 'BUTTON', type: 'button' });
      expect(tile.name, 'accessible name is the visible label').toBe(tile.label);
      expect(tile.icon !== null || tile.image, `${tile.name} carries a glyph id or a platform icon`).toBe(true);
    }
    expect(new Set(tiles.map(tile => tile.name)).size, 'no two tiles read alike').toBe(tiles.length);
    for (const tile of tiles) await expect(grid.getByRole('button', { name: tile.name!, exact: true })).toHaveCount(1);
    const found = format([...await auditTree(page), ...await auditPage(page, { targetSize: 24 })]);
    expect(found, found.join('\n')).toEqual([]);
  });
}
