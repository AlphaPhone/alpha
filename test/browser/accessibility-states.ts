import {chooseCalendarEventAction} from './helpers/browser-calendar';
import {openConnectionDiagnostics} from './helpers/connection-diagnostics';
import { expect, type Page } from '@playwright/test';
import {openCanonicalCalendarForm} from './helpers/canonical-calendar';
import {openLegacyNotes,openLegacyAttachment} from './helpers/legacy-notes';
import {openOwnedPhotoViewer,openPhotoShare} from './helpers/owned-photo';
import {installHomeCalendar} from './helpers/home-calendar';
import {calendarSyncFixture} from './calendar-sync-fixture';
import {settled} from './helpers/settled';

export type State = {
  name: string; open: (page: Page, theme?: 'light' | 'dark') => Promise<void>;
  shows?: string;
};

const offline = () => localStorage.setItem('alpha.connection.selection.v1', JSON.stringify({ kind: 'offline' }));
const settle = async (page: Page) => {
  await expect(page.locator('.alpha-phone')).toBeVisible();
  await settled(page);
};

const press = async (page: Page, steps: string[]) => {
  for (const step of steps) {
    if(step==='Share photo'){await openPhotoShare(page);continue;}
    if (step === 'Edit event' || step === 'Delete event') {
      await chooseCalendarEventAction(page, step);
      continue;
    }
    if (['Reply', 'Reply all', 'Forward', 'Move to Trash'].includes(step) &&
      await page.locator('.mail-message-menu').count() && !await page.locator('.mail-message-menu[open]').count()) {
      await page.getByLabel('Message actions', {exact: true}).click();
    }
    await (step === 'Photos tools' || step === 'Message actions' ? page.getByLabel(step, {exact: true}) : page.getByRole('button', {name: step, exact: true}).first()).click();
  }
};
const showing = async (page: Page, subview?: string) => {
  if (subview) await expect(page.locator(`[data-alpha-subview="${subview}"]:not([inert])`)).toBeVisible();
};
const live = (name: string, steps: string[] = [], shows?: string): State => ({
  name: `live ${name}`, shows,
  open: async (page, theme) => {
    await page.addInitScript(offline);
    await page.goto(theme ? `/?theme=${theme}` : '/');
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
    await press(page, steps);
    await settle(page);
    await showing(page, shows);
  },
});
export async function openFilesStorage(page:Page,theme='light') {
  await page.addInitScript(offline);
  await page.goto(`/?theme=${theme}`);
  await page.getByRole('button',{name:'Files',exact:true}).click();
  await page.getByRole('button',{name:'Internal storage',exact:true}).click();
  await expect(page.getByRole('button',{name:'Files options',exact:true})).toBeVisible();
}

const legacyNotes = (name: string, steps: string[], shows?: string): State => ({
  name: `live ${name}`, shows,
  open: async (page, theme) => {
    await page.addInitScript(offline);
    await page.goto(theme ? `/?theme=${theme}` : '/');
    await openLegacyNotes(page);
    await press(page, steps);
    await settle(page);
    await showing(page, shows);
  },
});
const ARRIVES: Record<string, string> = {};
const mock = (start: string, steps: string[] = [], shows?: string): State => ({
  name: `mock ${[start, ...steps].join(' > ')}`, shows,
  open: async (page, theme) => {
    if(start==='photos:viewer'&&steps.some(step=>step==='Edit photo'||step==='Photo info'||step==='Share photo'))await openOwnedPhotoViewer(page,theme);
    else await page.goto(`/?mode=mock&theme=${theme || 'light'}&start=${start}`);
    await settle(page);
    if (ARRIVES[start]) { await expect(page.getByRole('button', { name: ARRIVES[start], exact: true })).toBeVisible(); await settle(page); }
    if (steps.length) { await press(page, steps); await settle(page); }
    await showing(page, shows);
  },
});

export const LIVE_STATES: State[] = [
  live('Home'),
  live('Conversation', ['Open conversation']),
  live('Inbox (not connected)', ['Inbox']),
  live('Calendar', ['Calendar']),
  {name:'live Calendar new event',shows:'calendar-form',open:async(page,theme)=>{await openCanonicalCalendarForm(page,theme);await settle(page);await showing(page,'calendar-form');}},
  live('Calendar month', ['Calendar', 'Month view']),
  live('Browser', ['Browser']),
  live('Browser tabs', ['Browser', 'Tabs']),
  live('Camera (unavailable)', ['Camera']),
  live('Photos (empty)', ['Photos']),
  live('Maps (no location)', ['Maps']),
  live('Notes (empty)', ['Notes']),
  legacyNotes('Notes new note', ['New note']),
  {name:'live Notes retained records',open:async(page,theme)=>{
    await page.addInitScript(offline);await page.goto(theme?`/?theme=${theme}`:'/');
    await openLegacyNotes(page,[{id:'retained-accessibility-note',kind:'text',title:'Retained note',body:'Existing text remains available.'}]);
    await expect(page.getByRole('button',{name:'Open Retained note',exact:true})).toBeVisible();await settle(page);
  }},
  legacyNotes('Notes recently deleted', ['New note', 'More', 'Delete', 'Recently deleted'], 'notes-trash'),
  live('Files', ['Files']),
  live('Workflows', ['Workflows']),
  live('Settings', ['Settings']),
  live('Settings general', ['Settings', 'General']),
  live('Settings display', ['Settings', 'General', 'Display']),
  live('Settings privacy', ['Settings', 'Privacy']),
  live('Settings about', ['Settings', 'About']),
  {name:'live Settings licenses',open:async(page,theme)=>{
    await live('Settings licenses',['Settings','About','Licenses']).open(page,theme);
    await expect(page.getByRole('searchbox',{name:'Search components',exact:true})).toBeVisible();
    await settle(page);
  }},
  live('Settings app permissions', ['Settings', 'Privacy', 'Permissions']),
  live('Settings apps', ['Settings', 'Apps']),
  live('Settings accounts', ['Settings', 'Account']),
  live('Settings notifications', ['Settings', 'General', 'Notifications']),
  live('Settings calendar', ['Settings', 'Apps', 'Calendar']),
  live('Settings password manager', ['Settings', 'Apps', 'Passwords']),
  live('Browser menu', ['Browser', 'Menu']),
  live('Browser address', ['Browser', 'Edit address']),
  live('Workflow alarms', ['Workflows', 'New automation', 'Clock alarms']),
  legacyNotes('Notes note menu', ['New note', 'More']),
  {name:'live Notes source document',open:async(page,theme)=>{await page.addInitScript(offline);await page.goto(theme ? `/?theme=${theme}` : '/');await openLegacyAttachment(page);await settle(page);}},
  legacyNotes('Notes recorder', ['Record voice note'], 'notes-recorder'),
  live('Workflows new automation', ['Workflows', 'New automation'], 'automations-detail'),
];

export const BROWSER_APP_STATES: State[] = [live('Apps', ['Apps'])];

const SUBVIEW: Record<string, string> = {
  'inbox:mail': 'inbox-detail', 'inbox:compose': 'inbox-composing',
  'calendar:event': 'calendar-detail', 'calendar:invite': 'calendar-detail', 'calendar:add': 'calendar-detail', 'calendar:new': 'calendar-form',
  'browser:tabs': 'browser-tabs',
  'photos:viewer': 'photos-viewer',
  'notes:editor': 'notes-editor', 'notes:voice': 'notes-voice',
  'files:folder': 'files-folder', 'files:preview': 'files-preview',
  'workflows:flow': 'workflows-detail', 'workflows:run': 'workflows-runOpen', 'workflows:failed': 'workflows-runOpen', 'workflows:new': 'workflows-builder',
};

export const MOCK_STATES: State[] = [
  'home', 'shade', 'sheet', 'full',
  'inbox', 'inbox:mail', 'inbox:compose',
  'calendar', 'calendar:event', 'calendar:invite', 'calendar:month', 'calendar:add', 'calendar:new',
  'browser', 'browser:book', 'browser:tabs',
  'camera', 'camera:video',
  'photos', 'photos:viewer', 'photos:albums', 'photos:search',
  'maps', 'maps:search', 'maps:place', 'maps:route', 'maps:nav',
  'notes', 'notes:editor', 'notes:voice',
  'files', 'files:folder', 'files:preview',
  'workflows', 'workflows:flow', 'workflows:run', 'workflows:failed', 'workflows:new',
  'settings',
].map(start => mock(start, [], SUBVIEW[start])).concat([
  mock('inbox', ['Search email']),
  mock('inbox:mail', ['Message actions', 'Reply'], 'inbox-composing'),
  mock('calendar:event', ['Edit event'], 'calendar-form'),
  mock('workflows', ['Clock alarms']),
  mock('browser', ['Menu']),
  mock('browser', ['Menu', 'Bookmarks and history'], 'browser-library'),
  mock('browser', ['Menu', 'Share']),
  mock('browser', ['Edit address']),
  mock('photos:albums', ['Favorites'], 'photos-album'),
  mock('photos:viewer', ['Edit photo'], 'photos-edit'),
  mock('photos:viewer', ['Photo info']),
  mock('photos:viewer', ['Share photo']),
  mock('photos', ['Photos tools', 'Select photos']),
  mock('notes', ['Open The case for on-device agents'], 'notes-link'),
  mock('notes:editor', ['More', 'Share note']),
  {name:'live Files sort',open:async(page,theme)=>{await openFilesStorage(page,theme);await press(page,['Files options']);await settle(page);}},
  mock('files:preview', ['Rename']),
  mock('files:preview', ['Move file']),
  mock('files:preview', ['Share file']),
  mock('files:preview', ['Delete file']),
  mock('workflows:flow', ['Change'], 'workflows-builder'),
  mock('workflows', ['New automation', 'Edit When step'], 'workflows-builder'),
  mock('workflows:new', ['Add Read step'], 'workflows-builder'),
  mock('settings', ['About']),
]);

export async function connectMailbox(page: Page) {
  await page.evaluate(async () => {
    const { connectionController: controller } = await import('/src/runtime/connection-ui.tsx' as string);
    const { secureConnectionStore: store } = await import('/src/runtime/native-connection.ts' as string);
    const slots: Record<string, unknown> = {};
    store.read = async (key: string) => structuredClone(slots[key] ?? null) as any;
    store.compareExchange = async (key: string, prior: unknown, next: unknown) => {
      if (JSON.stringify(slots[key] ?? null) !== JSON.stringify(prior)) return { status: 'conflict' };
      if (next === null) delete slots[key]; else slots[key] = structuredClone(next);
      return { status: 'saved' };
    };
    const mail = (id: string, subject: string, extra: Record<string, unknown> = {}) => ({
      id, threadId: `thread-${id}`, subject, from: `Synthetic Sender ${id.toUpperCase()}`, fromEmail: `sender-${id}@example.test`, to: ['owner@example.test'], cc: [], replyTo: null,
      snippet: `A synthetic preview line that is long enough to need more than one row of the list (${id}).`, receivedAt: '2026-10-06T12:00:00Z', unread: false, ...extra,
    });
    const inbox = [
      mail('a', 'Quarterly planning review and budget notes', { unread: true }), mail('b', 'Re: Friday'), mail('c', 'A subject long enough that it cannot fit on one line of a phone at any text size', { unread: true }),
      mail('d', 'Receipt'), mail('e', 'Itinerary for the offsite'), mail('f', 'Notes'), mail('g', 'Invitation: design review'), mail('h', 'Welcome'),
    ];
    const client = {
      gmailAccounts: async () => [{ connectionId: 'grant-0', label: 'owner@example.test', configured: true, connected: true, reason: 'connected', grantedCapabilities: ['google.gmail.triage'] }],
      gmailInboxCapabilities: async () => ({ version: 1, from: 'owner@example.test', threads: true, send: false, providerDrafts: false, mailboxMutations: true, attachments: true, providerExactlyOnce: false, atomicDraftReplacement: false, readState: true }),
      gmailSearch: async (_grant: string, query: string) => ({ messages: query === 'in:inbox' ? structuredClone(inbox) : [], syncedAt: 'fixture', nextPageToken: null }),
      gmailRead: async (_grant: string, id: string) => ({ message: inbox.find(item => item.id === id), bodyText: `Synthetic body of ${id}.`, links: [] }),
      gmailThread: async (_grant: string, threadId: string) => {
        const message = inbox.find(item => item.threadId === threadId)!;
        return { messages: [{ message, bodyText: `Synthetic body paragraph for ${message.id}. `.repeat(40), historyId: `h-${message.id}`, attachments: [] }], total: 1, offset: 0, historyId: 'thread-history', nextOffset: null };
      },
      initiateGmail: async () => { throw Error('No live OAuth in fixture'); },
    };
    controller.getCloudClient = () => ({ client, sessionId: 'fixture-cloud', credentialId: 'fixture' } as any);
    const readSnapshot=controller.getSnapshot;let lastSnapshot:ReturnType<typeof readSnapshot>|undefined,snapshot:ReturnType<typeof readSnapshot>;
    const cloudAccount={environment:'production',userId:'fixture-owner',organizationId:'fixture-org',sessionId:'fixture-cloud',credentialId:'fixture'};
    controller.getSnapshot=()=>{const current=readSnapshot();if(current!==lastSnapshot){lastSnapshot=current;snapshot={...current,cloudAccount} as any;}return snapshot;};
  });
}
const connected = (name: string, steps: Array<string | RegExp> = [], options: { shows?: string; home?: boolean } = {}): State => ({
  name: `connected ${name}`, shows: options.shows,
  open: async (page, theme) => {
    await page.addInitScript(offline);
    await page.goto(theme ? `/?theme=${theme}` : '/');
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
    await connectMailbox(page);
    await page.getByRole('button', { name: 'Inbox', exact: true }).and(page.locator('[data-mobile-shell-tile]')).click();
    await expect(page.getByRole('button', { name: /^Unread, Synthetic Sender A/ })).toBeVisible();
    if (options.home) { await page.getByRole('button', { name: 'Back to apps', exact: true }).click(); await expect(page.locator('[data-alpha-home-inbox]')).toContainText('2 unread'); }
    for (const step of steps) await page.getByRole('button', { name: step, exact: typeof step === 'string' }).first().click();
    await settle(page);
    await showing(page, options.shows);
  },
});

export const CONNECTED_STATES: State[] = [
  connected('Home', [], { home: true }),
  connected('Inbox'),
  connected('Inbox sent (empty)', ['Sent']),
  connected('Inbox search', ['Search email']),
  connected('Inbox message', [/^Unread, Synthetic Sender A/], { shows: 'inbox-detail' }),
  connected('Inbox long subject', [/^Unread, Synthetic Sender C/], { shows: 'inbox-detail' }),
  connected('Inbox compose', ['Compose'], { shows: 'inbox-composing' }),
  connected('Settings', ['Settings'], { home: true }),
  connected('Settings Google', ['Settings', 'Account', 'Google & email'], { home: true }),
];

export const DEVELOPMENT_STATES: State[] = [
  {
    name: 'live Settings developer',
    open: async (page, theme) => {
      await page.addInitScript(offline);
      await page.goto(theme ? `/?theme=${theme}&tools=1` : '/?tools=1');
      await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
      await press(page, ['Settings', 'General', 'Developer']);
      await settle(page);
    },
  },
];

export const FAILURE_STATES: State[] = [
  {
    name: 'render failure recovery',
    open: async page => {
      await page.addInitScript(offline); await page.goto('/');
      await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
      await page.evaluate(() => window.dispatchEvent(new Event('alpha:force-render-error')));
      const recovery = page.getByRole('alertdialog', { name: 'Something went wrong' });
      await expect(recovery).toBeVisible();
      await recovery.getByText('Diagnostics', { exact: true }).click();
    },
  },
  {
    name: 'startup failure recovery',
    open: async page => {
      await page.addInitScript(offline); await page.goto('/');
      await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
      await page.evaluate(async () => { const module = await import('/src/runtime/error-boundary.tsx' as string); module.showRecoveryScreen('startup', new Error('private detail')); });
      const recovery = page.getByRole('alertdialog', { name: 'Something went wrong' });
      await expect(recovery).toBeVisible();
      await recovery.getByText('Diagnostics', { exact: true }).click();
    },
  },
];

export const FIXTURE_STATES: State[] = [
  mock('lock'),
  {
    name: 'mock photos:viewer > photo gone', shows: 'photos-empty',
    open: async (page, theme) => {
      await mock('photos:viewer', [], 'photos-viewer').open(page, theme);
      await page.evaluate(() => {
        const root = document.getElementById('root') as any, key = Object.keys(root).find(name => name.startsWith('__reactContainer$'))!;
        const pending = [root[key]];
        while (pending.length) {
          const fiber = pending.pop();
          if (typeof fiber?.stateNode?.vset === 'function') { fiber.stateNode.vset('photos', { open: 'photo-no-longer-in-library' }); return; }
          if (fiber?.sibling) pending.push(fiber.sibling);
          if (fiber?.child) pending.push(fiber.child);
        }
        throw Error('No phone shell');
      });
      await settle(page);
      await showing(page, 'photos-empty');
    },
  },
];

const launcherBridge = () => {
  localStorage.setItem('alpha.connection.selection.v1', JSON.stringify({ kind: 'offline' }));
  const w = window as any; w.androidBridge = {};
  w.launcherGoogleAgentAccess = {gmailChanges:false,calendarEdits:false};
  const plugins: Record<string, string[]> = {
    Agent: ['setGoogleAgentAccess'],
    ElizaSystem: ['listLauncherApps', 'launchApp', 'resolveDefaultApp', 'openDefaultApp', 'getBuildInfo', 'getLocaleInfo', 'getLaunchInfo'],
      DeviceApps: ['platformCapabilities'],
    DailyApps: ['surfaceInfo', 'requestPermissions', 'closeAssistant'],
    AlphaNotifications: ['status', 'list'],
    AlphaVoiceCloud: ['checkPermissions', 'requestPermissions'],
    AlphaDevice: ['openSettings'],
  };
  const answer = (plugin: string, method: string, input: any) => {
    if (plugin === 'Agent' && method === 'setGoogleAgentAccess') {
      if (typeof input?.gmailChanges !== 'boolean' || typeof input?.calendarEdits !== 'boolean') throw Error('Invalid Google access.');
      w.launcherGoogleAgentAccess = {gmailChanges:input.gmailChanges,calendarEdits:input.calendarEdits};
      return {};
    }
    if (plugin === 'ElizaSystem') {
      if (method === 'listLauncherApps') return { apps: [{ packageName: 'org.example.clock', label: 'Synthetic clock' }, { packageName: 'org.example.weather', label: 'Synthetic weather' }] };
      if (method === 'resolveDefaultApp') return { role: 'dial', available: false };
      if (method === 'getBuildInfo') return { launcher: true, version: 'stub' };
      if (method === 'getLaunchInfo') return { assistant: false };
      if (method === 'getLocaleInfo') return { locale: 'en-US', hour24: false };
      return {};
    }
    if (plugin === 'DailyApps' && method === 'surfaceInfo') return { assistant: false, topInset: 0, bottomInset: 0 };
    if (plugin === 'AlphaNotifications' && method === 'status') return { permissionGranted: true, appEnabled: true };
    if (plugin === 'AlphaNotifications' && method === 'list') return { items: [], scope: 'alpha-phone' };
    if (plugin === 'AlphaVoiceCloud' && method === 'checkPermissions') return { microphone: 'granted' };
    return {};
  };
  const cap: any = w.Capacitor = {
    Plugins: {},
    PluginHeaders: Object.entries(plugins).map(([name, methods]) => ({ name, methods: [...methods, 'addListener', 'removeListener'].map(m => ({ name: m, rtype: m === 'addListener' ? 'callback' : 'promise' })) })),
    nativeCallback: () => 'stub-callback',
    nativePromise: async (plugin: string, method: string, input: any) => answer(plugin, method, input),
  };
  for (const name of Object.keys(plugins)) cap.Plugins[name] = { addListener: () => ({ remove: async () => {} }) };
};
const launcher = (name: string, steps: string[] = [], shows?: string): State => ({
  name: `launcher ${name}`, shows,
  open: async (page, theme) => {
    await page.addInitScript(launcherBridge);
    await page.goto(theme ? `/?theme=${theme}` : '/');
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/standalone-app/);
    await press(page, steps);
    await settle(page);
    await showing(page, shows);
  },
});
export const INSTALLED_APPS_STATE: State = {
  ...launcher('Apps', ['Apps']),
  open: async (page, theme) => {
    await launcher('Apps', ['Apps']).open(page, theme);
    const drawer = page.getByRole('dialog', {name: 'Apps', exact: true});
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('button', {name: 'Open Synthetic clock', exact: true})).toBeVisible();
    await expect(drawer.getByRole('button', {name: 'Open Calendar', exact: true})).toHaveCount(0);
  },
};
export const LAUNCHER_STATES: State[] = [
  launcher('Home'),
  INSTALLED_APPS_STATE,
  launcher('Conversation', ['Open conversation']),
  launcher('Inbox', ['Inbox']),
  launcher('Calendar', ['Calendar']),
  launcher('Calendar month', ['Calendar', 'Month view']),
  launcher('Browser', ['Browser']),
  launcher('Camera', ['Camera']),
  launcher('Photos', ['Photos']),
  launcher('Maps', ['Maps']),
  launcher('Notes', ['Notes']),
  launcher('Files', ['Files']),
  launcher('Workflows', ['Workflows']),
  launcher('Settings', ['Settings']),
  launcher('Settings about', ['Settings', 'About']),
];

const syntheticCalendar = async (page: Page) => page.evaluate(async () => {
  const { BrowserCalendar } = await import('/src/browser/calendar.ts' as string), calendar = new BrowserCalendar(), day = new Date(); day.setHours(10, 0, 0, 0);
  for (const [title, offset] of [['Synthetic design review', 0], ['Synthetic venue walkthrough', 2]] as const)
    await calendar.save({ calendarId: 'local', title, location: 'Synthetic room 4', begin: day.getTime() + offset * 3_600_000, end: day.getTime() + (offset + 1) * 3_600_000, allDay: false, creationId: crypto.randomUUID() });
});
const calendarWithEvents: State = {
  name: 'connected Calendar with events',
  open: async (page, theme) => {
    await page.addInitScript(offline);
    await page.goto(theme ? `/?theme=${theme}` : '/');
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
    await syntheticCalendar(page);
    await press(page, ['Calendar']);
    await settle(page);
  },
};
CONNECTED_STATES.push(calendarWithEvents);

const AGENT_CALENDAR_DAY = { year: 2026, month: 9, day: 14 };
const agentCalendar = (name: string, steps: string[] = []): State => ({
  name: `connected Agent Calendar ${name}`,
  open: async (page, theme) => {
    const { year, month, day } = AGENT_CALENDAR_DAY;
    await page.clock.install({ time: new Date(year, month, day, 12, 0, 0) });
    await page.addInitScript(offline);
    await page.goto(theme ? `/?theme=${theme}` : '/');
    const start = new Date(year, month, day, 14, 30, 0), end = new Date(year, month, day, 15, 15, 0);
    await installHomeCalendar(page, { title: 'Synthetic planning review with a long enough title to wrap', startAt: start.toISOString(), endAt: end.toISOString() });
    await expect(page.locator('[data-alpha-home-calendar]')).toContainText('Synthetic planning review');
    await press(page, steps);
    if (steps.length) await expect(page.getByText(/^Synthetic planning review/).first()).toBeVisible();
    await settle(page);
  },
});
const googleCalendar = (name: string, review: boolean): State => ({
  name: `connected Google Calendar sync ${name}`,
  open: async (page, theme) => {
    const dialog = await calendarSyncFixture(page, false, theme);
    await expect(dialog).toBeVisible();
    if (review) {
      await dialog.getByRole('switch', { name: 'Sync', exact: true }).click();
      await expect(dialog.getByText(/owner@example.invalid.*Personal.*1 event/)).toBeVisible();
    }
    await settle(page);
    expect(await page.evaluate(() => (window as any).calendarSyncFixture.writes)).toBe(0);
  },
});
const DEVELOPMENT_REPLY = 'Development reply. Edit this response in Agent connection.';
const developmentAgent = (name: string, conversation: boolean): State => ({
  name: `connected agent ${name}`,
  open: async (page, theme) => {
    await page.goto(`/?mode=dev&theme=${theme || 'light'}`);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await openConnectionDiagnostics(page);
    await page.getByRole('button', { name: 'Connect development profile', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Development connections', exact: true })).toHaveCount(0);
    await expect.poll(() => page.evaluate(async () => !!(await import('/src/runtime/connection-ui.tsx' as string)).connectionController.getSnapshot().session), { timeout: 15_000 }).toBe(true);
    if (conversation) {
      await page.getByRole('button', { name: 'Back to apps', exact: true }).click();
      const composer = page.getByRole('textbox', { name: 'Ask Alpha', exact: true });
      await composer.fill('What is on my list for this afternoon?');
      await composer.press('Enter');
      await expect(page.locator('[data-alpha-layer="conversation"][aria-hidden="false"]').getByText(DEVELOPMENT_REPLY, { exact: true })).toBeVisible();
    }
    await settle(page);
  },
});
CONNECTED_STATES.push(
  agentCalendar('on Home'),
  agentCalendar('in Calendar', ['Calendar']),
  googleCalendar('account', false),
  googleCalendar('review', true),
  developmentAgent('Settings', false),
  developmentAgent('Conversation', true),
);

export async function setTextScale(page: Page, scale: number) {
  await page.evaluate(async value => {
    const harness = window as unknown as { __alphaTextZoom?: HTMLStyleElement };
    if (!harness.__alphaTextZoom) {
      const display = await import('/src/browser/display.ts' as string);
      display.installBrowserDisplay();
      const { installDockClearance } = await import('/src/runtime/dock-clearance.ts' as string);
      installDockClearance()();
      installDockClearance();
      harness.__alphaTextZoom = document.createElement('style');
      harness.__alphaTextZoom.dataset.alphaTestTextZoom = '';
      document.head.append(harness.__alphaTextZoom);
    }
    harness.__alphaTextZoom.textContent = `:root{--browser-text-scale:${value}!important}`;
  }, scale);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--alpha-text-scale').trim()), { timeout: 15_000 }).toBe(String(scale));
  await settled(page);
}
