import { test, expect, type Page } from '@playwright/test';

type App = { packageName: string; label: string; activityName?: string; user?: string; profile?: string; locked?: boolean; icon?: string };
type Refusal = { message: string; code: string; remove?: boolean };

async function nativeStub(page: Page, apps: App[], refusals: Record<string, Refusal> = {}, emptyHome = true) {
  await page.addInitScript(({ apps, refusals, emptyHome }) => {
    localStorage.setItem('alpha.connection.selection.v1', JSON.stringify({ kind: 'offline' }));
    if (emptyHome && !sessionStorage.getItem('stub.homeChoice')) {
      localStorage.setItem('alpha.launcher.favorites.v1', JSON.stringify({version:2,keys:[],defaultPolicy:'alpha-apps'}));
      sessionStorage.setItem('stub.homeChoice','1');
    }
    const w = window as any; w.nativeCalls = []; w.androidBridge = {};
    const saved = sessionStorage.getItem('stub.device');
    const device = w.device = { apps: saved ? JSON.parse(saved) : apps, refusals, failList: false };
    const persist = () => sessionStorage.setItem('stub.device', JSON.stringify(device.apps));
    const key = (app: any) => app.packageName + (app.activityName ? '/' + app.activityName : '') + (app.user ? '#' + app.user : '');
    const listeners: Record<string, (data: unknown) => void> = {};
    w.deviceChange = (next: any[], notify: boolean) => { device.apps = next; persist(); if (notify) listeners['ElizaSystem:launcherAppsChanged']?.({ reason: 'changed' }); };
    w.deviceListening = () => !!listeners['ElizaSystem:launcherAppsChanged'];
    const plugins: Record<string, string[]> = {
      ElizaSystem: ['listLauncherApps', 'launchApp', 'resolveDefaultApp', 'openDefaultApp', 'openAppInfo', 'getBuildInfo', 'getLocaleInfo', 'getLaunchInfo'],
      DeviceApps: ['platformCapabilities'],
      Agent: ['setGoogleAgentAccess'],
      DailyApps: ['surfaceInfo', 'requestPermissions', 'closeAssistant'],
      AlphaNotifications: ['status', 'list'],
      AlphaVoiceCloud: ['checkPermissions', 'requestPermissions'],
      AlphaDevice: ['openSettings'],
    };
    const answer = (plugin: string, method: string, options: any) => {
      if (plugin === 'ElizaSystem') {
        if (method === 'listLauncherApps') { if (device.failList) throw Error('Package manager unavailable'); return { apps: device.apps }; }
        if (method === 'launchApp') {
          const refusal = device.refusals[key(options)];
          if (refusal) {
            if (refusal.remove) { device.apps = device.apps.filter((app: any) => key(app) !== key(options)); persist(); }
            throw Object.assign(Error(refusal.message), { code: refusal.code });
          }
          if (!device.apps.some((app: any) => key(app) === key(options))) throw Object.assign(Error('This app is no longer installed.'), { code: 'not-installed' });
          return {};
        }
        if (method === 'resolveDefaultApp') return { role: 'dial', available: false };
        if (method === 'getBuildInfo') return { launcher: true, version: 'stub' };
        if (method === 'getLaunchInfo') return { assistant: false };
        if (method === 'getLocaleInfo') return { locale: 'en-US', hour24: false };
        return {};
      }
      if (plugin === 'DailyApps' && method === 'surfaceInfo') return { assistant: false, topInset: 0, bottomInset: 0 };
      if (plugin === 'AlphaNotifications' && method === 'status') return { permissionGranted: true, appEnabled: true };
      if (plugin === 'AlphaVoiceCloud' && method === 'checkPermissions') return { microphone: 'granted' };
      return {};
    };
    const cap: any = w.Capacitor = {
      Plugins: {},
      PluginHeaders: Object.entries(plugins).map(([name, methods]) => ({ name, methods: [...methods, 'addListener', 'removeListener'].map(m => ({ name: m, rtype: m === 'addListener' ? 'callback' : 'promise' })) })),
      nativeCallback: (plugin: string, method: string, options: any, callback: (data: unknown) => void) => {
        w.nativeCalls.push({ plugin, method, options });
        if (method === 'addListener' && options?.eventName && typeof callback === 'function') listeners[`${plugin}:${options.eventName}`] = callback;
        return 'stub-callback';
      },
      nativePromise: async (plugin: string, method: string, options: any) => { w.nativeCalls.push({ plugin, method, options }); return answer(plugin, method, options); },
    };
    for (const name of Object.keys(plugins)) cap.Plugins[name] = { addListener: () => ({ remove: async () => {} }) };
  }, { apps, refusals, emptyHome });
}
const calls = (page: Page, method: string) => page.evaluate(method => (window as any).nativeCalls.filter((c: any) => c.plugin === 'ElizaSystem' && c.method === method).map((c: any) => c.options ?? null), ({ list: 'listLauncherApps', launch: 'launchApp' } as Record<string, string>)[method] ?? method);
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const PNG2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const SETTINGS: App = { packageName: 'com.android.settings', activityName: 'com.android.settings.Settings', label: 'Settings', icon: PNG };
const NOTES_A: App = { packageName: 'org.example.notes', activityName: 'org.example.notes.Main', label: 'Notes', icon: PNG };
const NOTES_B: App = { packageName: 'com.vendor.notes', activityName: 'com.vendor.notes.Launch', label: 'Notes', icon: PNG2 };
const SUITE_MAIL: App = { packageName: 'com.vendor.suite', activityName: 'com.vendor.suite.MailActivity', label: 'Suite' };
const SUITE_CAL: App = { packageName: 'com.vendor.suite', activityName: 'com.vendor.suite.CalendarActivity', label: 'Suite' };
const WORK_NOTES: App = { packageName: 'com.vendor.notes', activityName: 'com.vendor.notes.Launch', label: 'Notes', user: '10', profile: 'work', locked: true };
const CLOCK: App = { packageName: 'com.android.deskclock', activityName: 'com.android.deskclock.DeskClock', label: 'Clock' };
const ALL = [SETTINGS, NOTES_A, NOTES_B, SUITE_MAIL, SUITE_CAL, WORK_NOTES, CLOCK];

const homeOrder = (page: Page) => page.locator('[data-alpha-home-apps] [data-alpha-home-key]').evaluateAll(nodes => nodes.map(node => node.closest('[data-mobile-shell-tile]')!.querySelector('[data-mobile-shell-tile-label]')!.textContent));
const names = (list: ReturnType<Page['locator']>) => list.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
const tiles = (drawer: ReturnType<Page['locator']>) => names(drawer.locator('[data-launcher-app] > button'));
const longPress = (target: ReturnType<Page['locator']>) => target.click({ button: 'right' });
async function openDrawer(page: Page) {
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Apps', exact: true });
  await expect(drawer).toBeVisible();
  return drawer;
}

test('fresh Alpha Home shows core apps and loads installed apps only in Apps', async ({ page }) => {
  await nativeStub(page, ALL, {}, false);
  await page.goto('/');
  for (const name of ['Inbox', 'Calendar', 'Camera', 'Photos', 'Notes', 'Settings'])
    await expect(page.getByRole('button', {name, exact: true})).toHaveCount(1);
  await expect(page.getByRole('button', {name: 'Clock', exact: true})).toHaveCount(0);
  expect(await calls(page, 'list')).toHaveLength(0);
  const drawer = await openDrawer(page);
  await expect(drawer.getByRole('button', {name: 'Open Clock', exact: true})).toHaveCount(1);
  await expect(drawer.getByRole('button', {name: 'Open Settings', exact: true})).toHaveCount(1);
  await expect(drawer.getByRole('button', {name: /Alpha Phone/})).toHaveCount(0);
  await expect(drawer.getByRole('button', {name: 'Open Inbox', exact: true})).toHaveCount(0);
  expect(await calls(page, 'list')).toHaveLength(1);
  await drawer.getByRole('button', {name: 'Open Clock', exact: true}).click();
  await expect.poll(() => calls(page, 'launch')).toEqual([{packageName: CLOCK.packageName, activityName: CLOCK.activityName}]);
  await drawer.getByRole('button', {name: 'Open Settings', exact: true}).click();
  await expect.poll(() => calls(page, 'launch')).toHaveLength(2);
  expect((await calls(page, 'launch'))[1]).toEqual({packageName: SETTINGS.packageName, activityName: SETTINGS.activityName});
});

test('Home and Apps icons fade on pointer press while keyboard focus stays visible', async ({page}) => {
  const time=new Date('2026-11-15T00:00:00Z');
  await page.clock.install({time});
  await page.clock.pauseAt(new Date(time.getTime()+1000));
  await page.emulateMedia({reducedMotion:'reduce'});
  await nativeStub(page, ALL, {}, false);
  await page.goto('/');

  async function pressIcon(tile: ReturnType<Page['locator']>, face: ReturnType<Page['locator']>) {
    const icon=face.locator(':scope > :first-child');
    await expect(tile).toBeVisible();
    await expect(icon).toHaveCSS('opacity', '1');
    expect(await icon.evaluate(node=>Number.parseFloat(getComputedStyle(node).transitionDuration))).toBeLessThan(0.001);
    const background=await face.evaluate(node=>getComputedStyle(node).backgroundColor);
    const bounds=(await icon.boundingBox())!;
    await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
    await page.mouse.down();
    try {
      await expect(icon).toHaveCSS('opacity', '0.55');
      await expect(face).toHaveCSS('background-color', background);
      await expect(face).toHaveCSS('opacity', '1');
      await expect(tile).toHaveCSS('outline-style', 'none');
    } finally {
      await page.mouse.move(0, 0);
      await page.mouse.up();
    }
    await expect(icon).toHaveCSS('opacity', '1');
    await page.keyboard.press('Tab');
    await tile.focus();
    await expect(tile).toBeFocused();
    await expect(tile).not.toHaveCSS('outline-style', 'none');
  }

  const homeTile=page.getByRole('region',{name:'Home',exact:true}).getByRole('button',{name:'Notes',exact:true});
  await pressIcon(homeTile,homeTile.locator('[data-mobile-shell-tile-face]'));
  const drawer=await openDrawer(page);
  const drawerTile=drawer.getByRole('button',{name:'Open Clock',exact:true});
  await pressIcon(drawerTile,drawerTile.locator(':scope > :first-child'));
  expect(await calls(page, 'launch')).toEqual([]);
});

test('Home reuses its launcher projection during composer edits and refreshes changed apps', async ({ page }, info) => {
  const inventory: App[] = Array.from({ length: 60 }, (_, index) => ({
    packageName: `org.example.app${index}`, label: `Installed app ${index}`,
  }));
  await nativeStub(page, inventory, {}, false);
  await page.goto('/');
  const home = page.locator('[data-mobile-shell-home]');
  const drawer = await openDrawer(page);
  await expect(drawer.getByRole('button', { name: 'Open Installed app 59', exact: true })).toBeVisible();
  await drawer.getByRole('button', { name: 'Close apps', exact: true }).click();
  await expect(home.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).deviceListening())).toBe(true);

  await page.evaluate(async () => {
    const {alphaViews} = await import('/src/product/alpha-product.ts');
    const counts = (window as any).homeProjectionCounts = { renders: 0, builtinKeys: 0, favoriteKeys: 0 };
    const {available, launcherKey, fromLauncherKey} = alphaViews;
    alphaViews.available = () => { counts.renders++; return available(); };
    alphaViews.launcherKey = view => { counts.builtinKeys++; return launcherKey(view); };
    alphaViews.fromLauncherKey = key => { counts.favoriteKeys++; return fromLauncherKey(key); };
  });
  const counts = () => page.evaluate(() => ({ ...(window as any).homeProjectionCounts }));
  const ask = page.getByRole('textbox', { name: 'Ask Alpha', exact: true });
  for (const text of ['a', 'ab', 'abc', 'abcd']) {
    const before = await counts();
    await ask.fill(text);
    await expect(ask).toHaveValue(text);
    await expect.poll(() => counts().then(value => value.renders)).toBeGreaterThan(before.renders);
  }
  const measured = await counts();
  await info.attach('stable Home projection counts', { body: JSON.stringify(measured), contentType: 'application/json' });
  expect(measured).toMatchObject({ builtinKeys: 0, favoriteKeys: 0 });

  await page.locator('[data-alpha-dock-scrim="true"]').click({ position: { x: 12, y: 12 } });
  const reopened = await openDrawer(page);
  await longPress(reopened.getByRole('button', { name: 'Open Installed app 0', exact: true }));
  await reopened.getByRole('menuitem', { name: 'Add to Home', exact: true }).click();
  const added = home.getByRole('button', { name: 'Installed app 0', exact: true });
  await expect(added).toBeVisible();
  const renamed = { ...inventory[0], label: 'Renamed app' };
  await page.evaluate(apps => (window as any).deviceChange(apps, true), [renamed, ...inventory.slice(1)]);
  await expect(added).toHaveCount(0);
  const current = home.getByRole('button', { name: 'Renamed app', exact: true });
  await expect(current).toBeVisible();
  await current.click();
  expect(await calls(page, 'launch')).toEqual([{ packageName: renamed.packageName }]);
  await page.evaluate(apps => (window as any).deviceChange(apps, true), inventory.slice(1));
  await expect(current).toHaveCount(0);
});

test('same-label apps are separate tiles and each opens exactly its own component and profile', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await nativeStub(page, ALL, { 'com.vendor.notes/com.vendor.notes.Launch#10': { message: 'Work apps are paused or locked. Turn on work apps in Android, then try again.', code: 'profile-locked' } });
  await page.goto('/');
  const drawer = await openDrawer(page);
  await expect.poll(() => tiles(drawer)).toEqual(['Open Clock', 'Open Notes (com.vendor.notes)', 'Open Notes (Work · locked)', 'Open Notes (org.example.notes)', 'Open Settings', 'Open Suite (CalendarActivity)', 'Open Suite (MailActivity)']);
  const columns = await drawer.locator('[data-launcher-app]').evaluateAll(nodes => new Set(nodes.slice(0, 4).map(node => Math.round(node.getBoundingClientRect().top))).size);
  expect(columns).toBe(1);
  await expect(drawer.getByRole('button', { name: 'Open Notes', exact: true })).toHaveCount(0);
  await expect(drawer.getByRole('button', { name: 'Open Notes (org.example.notes)', exact: true }).locator('img')).toHaveAttribute('src', PNG);
  await expect(drawer.getByRole('button', { name: 'Open Notes (com.vendor.notes)', exact: true }).locator('img')).toHaveAttribute('src', PNG2);
  await expect(drawer.getByRole('button', { name: 'Open Suite (MailActivity)', exact: true }).locator('img')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('apps-grid.png') });

  await drawer.getByRole('button', { name: 'Open Notes (com.vendor.notes)', exact: true }).click();
  await drawer.getByRole('button', { name: 'Open Suite (CalendarActivity)', exact: true }).click();
  await expect.poll(() => calls(page, 'launch')).toEqual([
    { packageName: 'com.vendor.notes', activityName: 'com.vendor.notes.Launch' },
    { packageName: 'com.vendor.suite', activityName: 'com.vendor.suite.CalendarActivity' },
  ]);
  await expect(drawer.getByRole('alert')).toHaveCount(0);

  await drawer.getByRole('button', { name: 'Open Notes (Work · locked)', exact: true }).click();
  await expect(drawer.getByRole('alert')).toHaveText('Notes could not be opened. Work apps are paused or locked. Turn on work apps in Android, then try again.');
  expect((await calls(page, 'launch')).slice(2)).toEqual([{ packageName: 'com.vendor.notes', activityName: 'com.vendor.notes.Launch', user: '10' }]);
  expect(errors).toEqual([]);
});

test('long-pressing an app offers Add to Home and App info; Home order persists across a cold start', async ({ page }, info) => {
  await nativeStub(page, ALL);
  await page.goto('/');
  let drawer = await openDrawer(page);
  for (const name of ['Settings', 'Notes (com.vendor.notes)', 'Clock']) {
    const tile = drawer.getByRole('button', { name: `Open ${name}`, exact: true });
    await longPress(tile);
    const menu = drawer.getByRole('menu');
    await expect(menu.getByRole('menuitem')).toHaveText(['Add to Home', 'App info']);
    expect(await calls(page, 'launch')).toEqual([]);
    await menu.getByRole('menuitem', { name: 'Add to Home', exact: true }).click();
    await expect(drawer).toHaveCount(0);
    if (name !== 'Clock') drawer = await openDrawer(page);
  }
  await expect.poll(() => homeOrder(page)).toEqual(['Settings', 'Notes', 'Clock']);
  drawer = await openDrawer(page);
  const clockTile = drawer.getByRole('button', { name: 'Open Clock', exact: true });
  await longPress(clockTile);
  const appInfo = drawer.getByRole('menuitem', { name: 'App info', exact: true });
  await expect(drawer.getByRole('menuitem', { name: 'On Home', exact: true })).toBeDisabled();
  await expect(appInfo).toBeFocused();
  await page.screenshot({ path: info.outputPath('apps-menu.png') });
  await appInfo.click();
  await expect.poll(() => calls(page, 'openAppInfo')).toEqual([{ packageName: CLOCK.packageName, activityName: CLOCK.activityName }]);
  await expect(drawer.getByRole('menu')).toHaveCount(0);
  await expect(clockTile).toBeFocused();
  await longPress(drawer.getByRole('button', { name: 'Open Settings', exact: true }));
  await expect(drawer.getByRole('menu')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('alpha-back', { cancelable: true })));
  await expect(drawer.getByRole('menu')).toHaveCount(0);
  await expect(drawer).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('alpha.launcher.favorites.v1') || 'null'))).toEqual({ version: 2, defaultPolicy: 'alpha-apps', keys: [
    'com.android.settings/com.android.settings.Settings', 'com.vendor.notes/com.vendor.notes.Launch', 'com.android.deskclock/com.android.deskclock.DeskClock' ] });

  await page.reload();
  await expect.poll(() => homeOrder(page)).toEqual(['Settings', 'Notes', 'Clock']);
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect.poll(() => calls(page, 'launch')).toEqual([{ packageName: 'com.vendor.notes', activityName: 'com.vendor.notes.Launch' }]);
});

test('a long-press menu on a tile at the bottom edge of a full drawer is shown whole, not clipped by the scroller', async ({ page }) => {
  const many: App[] = Array.from({ length: 40 }, (_, i) => ({ packageName: `org.example.app${String(i).padStart(2, '0')}`, activityName: 'Main', label: `App ${String(i).padStart(2, '0')}` }));
  await nativeStub(page, many);
  await page.goto('/');
  const drawer = await openDrawer(page);
  const scroller = drawer.locator('[data-installed-apps-scroll]');
  const tile = drawer.locator('[data-launcher-app]').nth(32);
  await tile.evaluate(node => { const scroller = node.closest('[data-installed-apps-scroll]') as HTMLElement; scroller.scrollTop += node.getBoundingClientRect().bottom - (scroller.getBoundingClientRect().bottom - 4); });
  await tile.locator('> button').dispatchEvent('contextmenu');
  const menu = drawer.getByRole('menu');
  await expect(menu).toBeVisible();
  const inside = await menu.evaluate(node => { const room = node.closest('[data-installed-apps-scroll]')!.getBoundingClientRect(), box = node.getBoundingClientRect(); return box.top >= room.top - 1 && box.bottom <= room.bottom + 1; });
  expect(inside, 'the whole menu is inside the scroller').toBe(true);
  await menu.getByRole('menuitem', { name: 'App info', exact: true }).dispatchEvent('click');
  await expect.poll(() => calls(page, 'openAppInfo')).toHaveLength(1);
  expect(await scroller.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
});
test('Home edit mode removes and rearranges icons, "+" restores hidden views, and Done persists', async ({ page }, info) => {
  await nativeStub(page, ALL, {}, false);
  await page.goto('/');
  const start = await homeOrder(page);
  const [first] = start;
  expect(start).toContain('Calendar');
  const held = page.getByRole('button', { name: first, exact: true });
  const box = (await held.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up();
  await expect(page.locator('html')).toHaveAttribute('data-active-view', 'home');
  const done = page.getByRole('button', { name: 'Done', exact: true });
  await expect(done).toBeVisible();
  const add = page.getByRole('button', { name: 'Add to Home', exact: true });
  await expect(add).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Apps', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Remove Calendar from Home', exact: true })).toHaveCount(1);
  expect(await page.locator('[data-alpha-home-key="alpha:calendar"] [data-alpha-home-remove]').evaluate(el => getComputedStyle(el).position)).toBe('absolute');
  expect(await page.locator('[data-alpha-home-key="alpha:calendar"]').evaluate(el => getComputedStyle(el).animationName)).toBe('alpha-wiggle');
  await page.getByRole('button', { name: 'Remove Calendar from Home', exact: true }).click();
  await expect.poll(() => homeOrder(page)).toEqual(start);
  await page.locator('[data-alpha-home-key="alpha:calendar"] [data-alpha-home-remove]').click();
  const left = start.filter(name => name !== 'Calendar');
  await expect.poll(() => homeOrder(page)).toEqual(left);
  await page.getByRole('button', { name: `Remove ${left[1]} from Home`, exact: true }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await homeOrder(page)).slice(0, 2)).toEqual([left[1], left[0]]);
  const icons = page.locator('[data-alpha-home-apps] [data-mobile-shell-tile]');
  const from = (await icons.nth(0).boundingBox())!, to = (await icons.nth(2).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => (await homeOrder(page)).slice(0, 3)).toEqual([left[0], left[2], left[1]]);
  await expect(page.locator('html')).toHaveAttribute('data-active-view', 'home');
  await page.screenshot({ path: info.outputPath('home-edit.png') });
  await add.click();
  const sheet = page.getByRole('dialog', { name: 'Add to Home', exact: true });
  await expect(sheet.getByRole('button')).toHaveText(['Calendar']);
  await sheet.getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await expect.poll(async () => (await homeOrder(page)).at(-1)).toBe('Calendar');
  await done.click();
  await expect(done).toHaveCount(0);
  const arranged = await homeOrder(page);
  await page.reload();
  await expect.poll(() => homeOrder(page)).toEqual(arranged);
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-active-view', 'calendar');
});

test('a Home hold belongs to its pointer and is retired when Apps opens', async ({ page }) => {
  await nativeStub(page, ALL, {}, false);
  await page.clock.install();
  await page.goto('/');
  const notes = page.getByRole('button', { name: 'Notes', exact: true });
  const done = page.getByRole('button', { name: 'Done', exact: true });
  await expect(notes).toBeVisible();
  const owner = { pointerId: 101, pointerType: 'touch', button: 0, clientX: 10, clientY: 10 };
  const other = { ...owner, pointerId: 102, clientX: 80 };
  await notes.dispatchEvent('pointerdown', owner);
  await notes.dispatchEvent('pointermove', other);
  await notes.dispatchEvent('pointerup', other);
  await page.clock.runFor(600);
  await expect(done).toBeVisible();
  await done.click();

  await notes.dispatchEvent('pointerdown', owner);
  await page.getByRole('button', { name: 'Apps', exact: true }).press('Enter');
  const drawer = page.getByRole('dialog', { name: 'Apps', exact: true });
  await expect(drawer).toBeVisible();
  await page.clock.runFor(600);
  await drawer.getByRole('button', { name: 'Close apps', exact: true }).click();
  await expect(notes).toBeVisible();
  await expect(done).toHaveCount(0);
});

test('an open drawer follows installs and removals, and a removed Home app is not shown', async ({ page }) => {
  await nativeStub(page, [SETTINGS, NOTES_A, CLOCK]);
  await page.goto('/');
  const drawer = await openDrawer(page);
  await expect.poll(() => tiles(drawer)).toEqual(['Open Clock', 'Open Notes', 'Open Settings']);
  await expect.poll(() => page.evaluate(() => (window as any).deviceListening())).toBe(true);
  for (const name of ['Clock', 'Settings']) {
    await longPress(drawer.getByRole('button', { name: `Open ${name}`, exact: true }));
    await drawer.getByRole('menuitem', { name: 'Add to Home', exact: true }).click();
    if (name === 'Clock') await openDrawer(page);
  }
  await expect.poll(() => homeOrder(page)).toEqual(['Clock', 'Settings']);
  await openDrawer(page);

  await page.evaluate(([settings, notes]) => (window as any).deviceChange([settings, notes], true), [SETTINGS, NOTES_A]);
  await expect(drawer.getByRole('button', { name: 'Open Clock', exact: true })).toHaveCount(0);
  await expect.poll(() => tiles(drawer)).toEqual(['Open Notes', 'Open Settings']);
  await expect.poll(() => homeOrder(page)).toEqual(['Settings']);

  const readsBefore = (await calls(page, 'list')).length;
  await page.evaluate(apps => { for (let i = 0; i < 3; i++) (window as any).deviceChange(apps, true); }, [SETTINGS, NOTES_A, NOTES_B, CLOCK]);
  await expect(drawer.getByRole('button', { name: 'Open Notes (com.vendor.notes)', exact: true })).toBeVisible();
  await expect(drawer.getByRole('button', { name: 'Open Notes (org.example.notes)', exact: true })).toBeVisible();
  expect((await calls(page, 'list')).length).toBe(readsBefore + 1);
  await expect.poll(() => homeOrder(page)).toEqual(['Clock', 'Settings']);

  await page.evaluate(apps => (window as any).deviceChange(apps, false), [SETTINGS]);
  await expect.poll(() => tiles(drawer)).toHaveLength(4);
  await page.evaluate(() => document.dispatchEvent(new Event('resume')));
  await expect.poll(() => tiles(drawer)).toEqual(['Open Settings']);

  await drawer.getByRole('button', { name: 'Close apps', exact: true }).click();
  const reads = (await calls(page, 'list')).length;
  await page.evaluate(apps => (window as any).deviceChange(apps, true), [SETTINGS, CLOCK]);
  await expect.poll(async () => (await calls(page, 'list')).length).toBe(reads + 1);
  await expect.poll(() => homeOrder(page)).toEqual(['Clock', 'Settings']);
  await openDrawer(page);
  await expect.poll(() => tiles(drawer)).toEqual(['Open Clock', 'Open Settings']);
});

test('an app removed or disabled behind a stale tile reports why and leaves the grid', async ({ page }) => {
  await nativeStub(page, [SETTINGS, NOTES_A, CLOCK], {
    'org.example.notes/org.example.notes.Main': { message: 'This app is no longer installed.', code: 'not-installed', remove: true },
    'com.android.deskclock/com.android.deskclock.DeskClock': { message: 'This app is disabled. Enable it in Android settings to open it.', code: 'disabled', remove: true },
  });
  await page.goto('/');
  const drawer = await openDrawer(page);
  await drawer.getByRole('button', { name: 'Open Notes', exact: true }).click();
  await expect(drawer.getByRole('alert')).toHaveText('Notes could not be opened. This app is no longer installed.');
  await expect(drawer.getByRole('button', { name: 'Open Notes', exact: true })).toHaveCount(0);
  await drawer.getByRole('button', { name: 'Open Clock', exact: true }).click();
  await expect(drawer.getByRole('alert')).toHaveText('Clock could not be opened. This app is disabled. Enable it in Android settings to open it.');
  await expect(drawer.getByRole('button', { name: 'Open Clock', exact: true })).toHaveCount(0);
  expect(await calls(page, 'launch')).toHaveLength(2);
  await expect.poll(() => tiles(drawer)).toEqual(['Open Settings']);
  await expect(page.locator('html')).toHaveAttribute('data-active-view', 'home');
  await expect(drawer).toBeVisible();
  await drawer.getByRole('searchbox', { name: 'Search apps', exact: true }).fill('set');
  await expect(drawer.getByRole('alert')).toHaveCount(0);
});

test('a failed refresh clears the grid instead of leaving a stale one, and HOME closes the drawer', async ({ page }) => {
  await nativeStub(page, [SETTINGS, CLOCK]);
  await page.goto('/');
  const drawer = await openDrawer(page);
  await expect.poll(() => tiles(drawer)).toEqual(['Open Clock', 'Open Settings']);
  await page.evaluate(() => { (window as any).device.failList = true; (window as any).deviceChange((window as any).device.apps, true); });
  await expect(drawer.getByText('Apps could not be read.', { exact: true })).toBeVisible();
  await expect(drawer.getByRole('button', { name: /^Open / })).toHaveCount(0);
  await page.evaluate(() => { (window as any).device.failList = false; });
  await drawer.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(drawer.getByRole('button', { name: 'Open Settings', exact: true })).toBeVisible();

  await drawer.getByRole('searchbox', { name: 'Search apps', exact: true }).fill('set');
  await drawer.getByRole('button', { name: 'Open Settings', exact: true }).click();
  await expect.poll(() => calls(page, 'launch')).toHaveLength(1);
  await page.evaluate(() => window.dispatchEvent(new Event('launcher-home')));
  await expect(drawer).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-active-view', 'home');
  await openDrawer(page);
  await expect(drawer.getByRole('searchbox', { name: 'Search apps', exact: true })).toHaveValue('');
  await expect.poll(() => tiles(drawer)).toEqual(['Open Clock', 'Open Settings']);
});

test('the entry menu is a keyboard menu: focus moves in, arrows move between items, closing returns focus to the tile', async ({ page }) => {
  await nativeStub(page, ALL);
  await page.goto('/');
  const drawer = await openDrawer(page);
  const tile = drawer.getByRole('button', { name: 'Open Settings', exact: true });
  await tile.focus();
  await page.keyboard.press('Shift+F10');
  const menu = drawer.getByRole('menu');
  if (!await menu.count()) await longPress(tile);
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Add to Home', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem', { name: 'App info', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem', { name: 'Add to Home', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(menu.getByRole('menuitem', { name: 'App info', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(drawer).toBeVisible();
  await expect(tile).toBeFocused();
  await longPress(tile);
  await menu.getByRole('menuitem', { name: 'Add to Home', exact: true }).click();
  const again = await openDrawer(page);
  await longPress(again.getByRole('button', { name: 'Open Settings', exact: true }));
  await expect(again.getByRole('menuitem', { name: 'App info', exact: true })).toBeFocused();
});

test('Drawer keeps one owner across another pointer release', async ({ page }) => {
  await nativeStub(page, [CLOCK]);
  await page.clock.install();
  await page.goto('/');
  const drawer = await openDrawer(page);
  const clock = drawer.getByRole('button', {name: 'Open Clock', exact: true});
  await expect(clock).toBeVisible();
  const pointer = {pointerId: 101, pointerType: 'touch', button: 0, clientX: 10, clientY: 10};
  await clock.dispatchEvent('pointerdown', pointer);
  await clock.dispatchEvent('pointerup', {...pointer, pointerId: 102});
  await page.clock.runFor(600);
  await expect(drawer.getByRole('menu', {name: 'Clock', exact: true})).toBeVisible();
});

test('Drawer does not reopen a menu after removal and reinstall', async ({ page }) => {
  await nativeStub(page, [CLOCK]);
  await page.clock.install();
  await page.goto('/');
  const drawer = await openDrawer(page);
  const clock = drawer.getByRole('button', {name: 'Open Clock', exact: true});
  const menu = drawer.getByRole('menu', {name: 'Clock', exact: true});
  await expect(clock).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).deviceListening())).toBe(true);
  await longPress(clock);
  await expect(menu).toBeVisible();
  await page.evaluate(() => (window as any).deviceChange([], true));
  await page.clock.runFor(200);
  await expect(clock).toHaveCount(0);
  await expect(menu).toHaveCount(0);
  await page.evaluate(app => (window as any).deviceChange([app], true), CLOCK);
  await page.clock.runFor(200);
  await expect(clock).toBeVisible();
  await expect(menu).toHaveCount(0);
  await clock.press('Enter');
  await expect.poll(() => calls(page, 'launch')).toEqual([{packageName: CLOCK.packageName, activityName: CLOCK.activityName}]);
});

test('a retired drawer hold cannot open the reinstalled component', async ({ page }) => {
  await nativeStub(page, [CLOCK]);
  await page.clock.install();
  await page.goto('/');
  const drawer = await openDrawer(page);
  const clock = drawer.getByRole('button', {name: 'Open Clock', exact: true});
  await expect(clock).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).deviceListening())).toBe(true);
  await clock.dispatchEvent('pointerdown', {pointerId: 101, pointerType: 'touch', button: 0});
  await page.evaluate(() => (window as any).deviceChange([], true));
  await page.clock.runFor(150);
  await expect(clock).toHaveCount(0);
  await page.evaluate(app => (window as any).deviceChange([app], true), CLOCK);
  await page.clock.runFor(500);
  await expect(clock).toBeVisible();
  await expect(drawer.getByRole('menu', {name: 'Clock', exact: true})).toHaveCount(0);
});
