import {test, expect, type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {captureInputs, checkTraces} from '../../specs/quint/refinement/check-traces.mjs';

// Refinement of specs/quint/application/SettingsNavigation.qnt through the installed Settings
// adapter (installSettingsAdapter) in the development server, product settings (no ?tools=1):
// Settings rows are tapped, Android Back is the alpha-back event, another surface is the
// alpha:settings-page event, a direct selection is the development jump (shell.preset), and the
// password list is the development vault (?mode=dev, synthetic records only). Every observed state
// is checked against the model, and each modelled link must be a rendered row.
const sources = ['apps/app/src/prototype/settings-adapter.ts', 'apps/app/src/prototype/model.js',
  'apps/app/src/prototype/template.html', 'apps/app/src/passwords/password-manager.ts',
  'apps/app/src/passwords/dev-vault.ts', 'apps/app/src/main.tsx', 'test/browser/settings-navigation-refinement.spec.ts'];
const model = readFileSync('specs/quint/application/SettingsNavigation.qnt', 'utf8');
const between = (start: string) => { const from = model.indexOf(start); return model.slice(from, model.indexOf('\n\n', from)); };
const quintSet = (name: string) => [...between(`pure val ${name} = Set(`).split(')')[0].matchAll(/"([^"]*)"/g)].map(m => m[1]);
const children: Record<string, string[]> = Object.fromEntries([...between('pure val CHILDREN = Map(').matchAll(/"([^"]*)" -> Set\(([^)]*)\)/g)]
  .map(m => [m[1], [...m[2].matchAll(/"([^"]*)"/g)].map(c => c[1])]));
const license = (JSON.parse(readFileSync('apps/app/public/licenses/third-party-notices.json', 'utf8')) as Array<{name: string; version: string}>)[0];

// The page title the adapter draws, as the model's page key.
const shownByTitle: Record<string, string> = {
  Settings: 'root', General: 'settings-general', Privacy: 'settings-privacy', Apps: 'settings-apps', About: 'about',
  Display: 'display', Notifications: 'notifications', 'App permissions': 'settings-permissions', Licenses: 'licenses',
  'License details': 'license-detail', 'Password manager': 'password-provider', 'New password': 'password-entry',
  'Edit password': 'password-entry', Calendar: 'calendar', Inbox: 'app-settings-inbox', Workflows: 'app-settings-workflows',
};
// The row a page key is opened by.
const rowName: Record<string, string> = {
  'settings-general': 'General', 'settings-privacy': 'Privacy', 'settings-apps': 'Apps', 'settings-help': 'About',
  display: 'Display', notifications: 'Notifications', 'settings-permissions': 'Permissions', calendar: 'Calendar',
  'password-provider': 'Passwords', 'app-settings-inbox': 'Inbox', 'app-settings-workflows': 'Workflows',
  licenses: 'Licenses', 'license-detail': `${license.name} ${license.version}`, 'password-entry': 'Add password',
};
// Agent activity is drawn only in the Android build.
const nativeOnly = new Set(['agent-activity']);

const current = (page: Page) => page.locator('[data-settings-page]:not([inert])').last();
async function observe(page: Page) {
  const seen = await page.evaluate(async () => {
    const screen = document.querySelector('[data-screen]') as any;
    let fiber = screen[Object.keys(screen).find(name => name.startsWith('__reactFiber$'))!];
    while (fiber && typeof fiber.stateNode?.vget !== 'function') fiber = fiber.return;
    const shell = fiber.stateNode, state = shell.vget('settings');
    const {passwordManagerHoldsEntries} = await import('/src/passwords/password-manager.ts');
    const pages = [...document.querySelectorAll('[data-settings-page]:not([inert])')];
    return {open: shell.S().view === 'settings', page: state.page || '', category: state.settingsCategory || '',
      title: pages.at(-1)?.getAttribute('data-settings-page') ?? null, unlocked: passwordManagerHoldsEntries(),
      sheet: !!document.querySelector('[aria-label="Close sheet"]')};
  });
  expect(seen.sheet, 'the live Settings draws no sheet').toBe(false);
  const shown = seen.open ? shownByTitle[seen.title ?? ''] ?? `unmapped:${seen.title}` : 'closed';
  return {'s.page': seen.page, 's.category': seen.category, 's.open': seen.open, 's.shown': shown, 's.unlocked': seen.unlocked};
}
const back = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event('alpha-back', {cancelable: true})));

type Step = [name: string, args: string[], shown: string, unlocked?: boolean];
async function perform(page: Page, [name, args]: Step) {
  if (name === 'openCategory' || name === 'openChild') await current(page).getByRole('button', {name: rowName[args[0]], exact: true}).click();
  else if (name === 'back') await back(page);
  else if (name === 'unlock') await current(page).getByRole('button', {name: 'Unlock passwords', exact: true}).click();
  else if (name === 'openSection') await page.evaluate(section => window.dispatchEvent(new CustomEvent('alpha:settings-page', {detail: {page: section}, cancelable: true})), args[0]);
  else if (name === 'restore') await page.evaluate(selected => {
    const screen = document.querySelector('[data-screen]') as any;
    let fiber = screen[Object.keys(screen).find(key => key.startsWith('__reactFiber$'))!];
    while (fiber && typeof fiber.stateNode?.preset !== 'function') fiber = fiber.return;
    fiber.stateNode.preset('settings:' + selected);
  }, args[0]);
  else throw Error('Unknown step ' + name);
}
/** Each modelled link from the shown page is a rendered row on it. */
async function checkLinks(page: Page, shown: string, unlocked: boolean) {
  if (shown === 'root') {
    const rows = quintSet('ROOT_ROWS').map(key => rowName[key]);
    for (const name of rows) await expect(current(page).getByRole('button', {name, exact: true})).toBeVisible();
  }
  for (const child of children[shown] ?? []) {
    if (nativeOnly.has(child) || (child === 'password-entry' && !unlocked)) continue;
    await expect(current(page).getByRole('button', {name: rowName[child], exact: true})).toBeVisible();
  }
}

const runs: Array<[string, Step[]]> = [
  ['categoryBack', [['openCategory', ['settings-general'], 'settings-general'], ['openChild', ['display'], 'display'],
    ['back', [], 'settings-general'], ['back', [], 'root'], ['back', [], 'closed']]],
  ['aboutNestedBack', [['openCategory', ['settings-help'], 'about'], ['openChild', ['licenses'], 'licenses'],
    ['openChild', ['license-detail'], 'license-detail'], ['back', [], 'licenses'], ['back', [], 'about'], ['back', [], 'root']]],
  ['privacyPermissionsBack', [['openCategory', ['settings-privacy'], 'settings-privacy'], ['openChild', ['settings-permissions'], 'settings-permissions'],
    ['openChild', ['notifications'], 'notifications'], ['back', [], 'settings-privacy'], ['back', [], 'root']]],
  ['passwordLock', [['openCategory', ['settings-apps'], 'settings-apps'], ['openChild', ['password-provider'], 'password-provider'],
    ['unlock', [], 'password-provider', true], ['openChild', ['password-entry'], 'password-entry', true],
    ['back', [], 'password-provider', true], ['back', [], 'settings-apps'], ['openChild', ['password-provider'], 'password-provider']]],
  ['sectionOpensInCategory', [['back', [], 'closed'], ['openSection', ['display'], 'display'], ['back', [], 'settings-general']]],
  ['sectionRefused', [['openCategory', ['settings-apps'], 'settings-apps'], ['openSection', ['developer'], 'settings-apps'],
    ['openSection', ['password-entry'], 'settings-apps'], ['openSection', ['wifi'], 'settings-apps'], ['openSection', ['battery'], 'settings-apps']]],
  ['sectionLocksVault', [['openCategory', ['settings-apps'], 'settings-apps'], ['openChild', ['password-provider'], 'password-provider'],
    ['unlock', [], 'password-provider', true], ['openSection', ['display'], 'display']]],
  ['retiredPages', [['restore', ['wifi'], 'root'], ['back', [], 'root'], ['back', [], 'closed'], ['restore', ['accounts'], 'root'],
    ['restore', ['bluetooth'], 'root'], ['restore', ['mobile'], 'root'], ['restore', ['battery'], 'root']]],
];

test('Settings navigation through the installed adapter refines SettingsNavigation', async ({page}, info) => {
  test.setTimeout(240000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const driverHashes = captureInputs(sources);
  await page.addInitScript(() => localStorage.setItem('alpha.connection.selection.v1', JSON.stringify({kind: 'offline'})));
  const traces = [];
  for (const [name, steps] of runs) {
    await page.goto('/?mode=dev');
    await page.getByRole('button', {name: 'Settings', exact: true}).click();
    await expect(current(page)).toHaveAttribute('data-settings-page', 'Settings');
    const first = await observe(page);
    await checkLinks(page, 'root', false);
    const trace = {name, init: {name: 'init'}, expect: first, steps: [] as any[]};
    for (const step of steps) {
      await perform(page, step);
      const [, , shown, unlocked = false] = step;
      await expect.poll(async () => { const seen = await observe(page); return [seen['s.shown'], seen['s.unlocked']]; },
        {message: `${name}: ${step[0]}(${step[1].join(', ')})`}).toEqual([shown, unlocked]);
      const seen = await observe(page);
      if (seen['s.open']) await checkLinks(page, seen['s.shown'], seen['s.unlocked']);
      trace.steps.push({label: `${step[0]}(${step[1].join(', ')})`, action: {name: step[0], args: step[1]}, expect: seen});
    }
    traces.push(trace);
  }
  // A stale reference sheet (none is reachable in the live build) is never drawn.
  for (const kind of ['wipe', 'conn', 'wifiPw', 'forget', 'voice']) {
    await page.evaluate(sheetKind => {
      const screen = document.querySelector('[data-screen]') as any;
      let fiber = screen[Object.keys(screen).find(key => key.startsWith('__reactFiber$'))!];
      while (fiber && typeof fiber.stateNode?.vset !== 'function') fiber = fiber.return;
      fiber.stateNode.openView('settings'); fiber.stateNode.vset('settings', {sheet: {kind: sheetKind, id: 'stale'}});
    }, kind);
    await expect(page.locator('[aria-label="Close sheet"]')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  const receipt = await checkTraces({model: 'SettingsNavigation', id: 'SettingsNavigationInstalled', sources, driverHashes, traces,
    scope: 'bounded-orchestration', assumptions: [
      'The development server runs the installed Settings adapter with product settings (developer tools off) in a browser, not on Android.',
      'Rows are tapped by their accessible names; Android Back is the alpha-back event; another surface is the alpha:settings-page event; a direct selection is the development jump (shell.preset).',
      'The password list is the development vault; unlocked is passwordManagerHoldsEntries().',
    ]});
  expect(receipt.passed).toBe(true);
  await info.attach('quint-refinement-receipt', {body: JSON.stringify(receipt), contentType: 'application/json'});
  expect(errors).toEqual([]);
});
