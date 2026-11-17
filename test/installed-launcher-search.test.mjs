// Search ranking and same-label disambiguation of Alpha's installed-app launcher
// (apps/app/src/ui/mobile-shell/installed-launcher.ts), which the Apps drawer shows through
// appsDrawerEntries. Ported from the elizaOS native-system launcher suite
// (plugins/plugin-native-system/test/launcher.test.mjs at the pinned commit), which tests upstream's
// file, not Alpha's copy.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tsImport} from './support/ts-import.mjs';

const {filterLauncherApps, describeLauncherApps: describe, appKey} = await tsImport('../apps/app/src/ui/mobile-shell/installed-launcher.ts', import.meta.url);
const {appsDrawerEntries} = await tsImport('../apps/app/src/ui/mobile-shell/InstalledAppsGridDrawer.tsx', import.meta.url);
const describeLauncherApps = apps => describe(apps, {productName: 'Alpha Phone', builtinPrefix: 'alpha:'});

const icon = 'data:image/png;base64,iVBORw0KGgo=';
const apps = [
  {packageName: 'com.android.settings', label: 'Settings', icon},
  {packageName: 'org.example.camera', label: 'Caméra'},
  {packageName: 'com.android.chrome', label: 'Chrome'},
  {packageName: 'com.example.reset', label: 'Reset tools'},
];
const twins = [
  {packageName: 'org.example.notes', activityName: 'org.example.notes.Main', label: 'Notes'},
  {packageName: 'com.vendor.notes', activityName: 'com.vendor.notes.Launch', label: 'Notes'},
  {packageName: 'com.vendor.suite', activityName: 'com.vendor.suite.MailActivity', label: 'Suite'},
  {packageName: 'com.vendor.suite', activityName: 'com.vendor.suite.CalendarActivity', label: 'Suite'},
  {packageName: 'com.vendor.notes', activityName: 'com.vendor.notes.Launch', label: 'Notes', user: '10', profile: 'work', locked: true},
  {packageName: 'com.android.settings', activityName: 'com.android.settings.Settings', label: 'Settings'},
];

test('search matches labels ignoring case and accents, prefix first, then package names', () => {
  assert.deepEqual(filterLauncherApps(apps, '').map(a => a.label), ['Caméra', 'Chrome', 'Reset tools', 'Settings']);
  assert.deepEqual(filterLauncherApps(apps, 'set').map(a => a.label), ['Settings', 'Reset tools']);
  assert.deepEqual(filterLauncherApps(apps, 'CAMERA').map(a => a.label), ['Caméra']);
  assert.deepEqual(filterLauncherApps(apps, 'cafe'), []);
  assert.deepEqual(filterLauncherApps([...apps, {packageName: 'org.example.cafe', label: 'Café'}], 'cafe').map(a => a.label), ['Café']);
  assert.deepEqual(filterLauncherApps(apps, 'android').map(a => a.label), ['Chrome', 'Settings']);
  assert.deepEqual(filterLauncherApps(apps, '  sEt ').map(a => a.label), ['Settings', 'Reset tools'], 'the query is trimmed');
  assert.deepEqual(filterLauncherApps(apps, 'zzz'), []);
  assert.deepEqual(apps.map(a => a.label), ['Settings', 'Caméra', 'Chrome', 'Reset tools'], 'the input list is not reordered');
});

test('the Apps drawer lists installed entries in search order with their secondary text, never product apps', () => {
  const snapshot = {status: 'ready', apps: [{packageName: 'alpha:settings', label: 'Settings'}, ...twins], dial: null, launching: null, launchError: null, favorites: []};
  const entries = appsDrawerEntries(snapshot, 'alpha:', 'not');
  assert.deepEqual(entries.map(entry => [entry.key, entry.detail]), [
    ['com.vendor.notes/com.vendor.notes.Launch', ['com.vendor.notes']],
    ['com.vendor.notes/com.vendor.notes.Launch#10', ['Work · locked']],
    ['org.example.notes/org.example.notes.Main', ['org.example.notes']],
  ]);
  assert.deepEqual(appsDrawerEntries(snapshot, 'alpha:', 'settings').map(entry => entry.key), ['com.android.settings/com.android.settings.Settings']);
});

test('entries with the same label are told apart by package, activity or profile', () => {
  const details = describeLauncherApps(twins);
  assert.deepEqual(details.get(appKey(twins[0])), ['org.example.notes']);
  assert.deepEqual(details.get(appKey(twins[1])), ['com.vendor.notes']);
  assert.deepEqual(details.get(appKey(twins[2])), ['MailActivity']);
  assert.deepEqual(details.get(appKey(twins[3])), ['CalendarActivity']);
  assert.deepEqual(details.get(appKey(twins[4])), ['Work · locked']);
  assert.deepEqual(details.get(appKey(twins[5])), []);
  assert.deepEqual(describeLauncherApps([{packageName: 'a.b', label: 'Mail', user: '10', profile: 'work', locked: false}]).get('a.b#10'), ['Work']);
});

test('same-label entries stay distinguishable when packages, activities and profiles overlap', () => {
  const mixed = [
    {packageName: 'alpha:settings', label: 'Settings'},
    {packageName: 'com.android.settings', label: 'Settings'},
    {packageName: 'org.example.notes', activityName: 'org.example.notes.Main', label: 'Notes'},
    {packageName: 'com.vendor.notes', activityName: 'com.vendor.notes.One', label: 'Notes'},
    {packageName: 'com.vendor.notes', activityName: 'com.vendor.notes.Two', label: 'Notes'},
    {packageName: 'com.vendor.suite', activityName: 'com.vendor.suite.mail.Main', label: 'Suite'},
    {packageName: 'com.vendor.suite', activityName: 'com.vendor.suite.calendar.Main', label: 'Suite'},
    {packageName: 'com.vendor.chat', activityName: 'com.vendor.chat.Main', label: 'Chat', user: '10', profile: 'work', locked: false},
    {packageName: 'com.vendor.chat', activityName: 'com.vendor.chat.Main', label: 'Chat', user: '11', profile: 'work', locked: false},
  ];
  const details = describeLauncherApps(mixed);
  assert.deepEqual(mixed.map(app => details.get(appKey(app))), [
    ['Alpha Phone'],
    ['com.android.settings'],
    ['org.example.notes'],
    ['com.vendor.notes', 'One'],
    ['com.vendor.notes', 'Two'],
    ['com.vendor.suite.mail.Main'],
    ['com.vendor.suite.calendar.Main'],
    ['Work', 'com.vendor.chat.Main', 'profile 10'],
    ['Work', 'com.vendor.chat.Main', 'profile 11'],
  ]);
  assert.equal(new Set(mixed.map(app => `${app.label}|${details.get(appKey(app)).join('|')}`)).size, mixed.length, 'no two rows read the same');
});

test('rows that would still read the same get their full identity as a last resort', () => {
  // A profile entry without an activity, and an activity whose short name reads like a profile.
  const odd = [
    {packageName: 'alpha:first', label: 'Calendar'},
    {packageName: 'alpha:second', label: 'Calendar'},
    {packageName: 'com.vendor.chat', label: 'Chat', user: '10', profile: 'work', locked: false},
    {packageName: 'com.vendor.chat', label: 'Chat', user: '11', profile: 'work', locked: false},
    {packageName: 'org.example.notes', activityName: 'org.example.notes.Work', label: 'Notes'},
    {packageName: 'org.example.notes', activityName: 'org.example.notes.Home', label: 'Notes'},
    {packageName: 'com.vendor.notes', activityName: 'com.vendor.notes.Main', label: 'Notes', user: '10', profile: 'work', locked: false},
  ];
  const details = describeLauncherApps(odd);
  assert.deepEqual(odd.map(app => details.get(appKey(app))), [
    ['Alpha Phone', 'alpha:first'],
    ['Alpha Phone', 'alpha:second'],
    ['Work', 'com.vendor.chat', 'profile 10'],
    ['Work', 'com.vendor.chat', 'profile 11'],
    ['Work', 'org.example.notes', 'org.example.notes.Work'],
    ['Home'],
    ['Work', 'com.vendor.notes', 'com.vendor.notes.Main', 'profile 10'],
  ]);
  // Every mix of packages, activities, labels and profiles: no two different entries read alike.
  let seed = 42;
  const next = n => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * n);
  };
  const packages = ['a.one', 'a.two', 'b.one'], activities = ['Main', 'x.Main', 'Other', 'Work', ''],
    labels = ['Notes', 'notes', 'Nótes', 'Mail'], users = ['', '10', '11', '12'], kinds = {10: 'work', 11: 'work', 12: 'clone'};
  for (let round = 0; round < 3000; round++) {
    const byKey = new Map();
    for (let i = 0, count = 2 + next(7); i < count; i++) {
      const packageName = packages[next(3)], activity = activities[next(5)], user = users[next(4)], app = {packageName, label: labels[next(4)]};
      if (activity) app.activityName = `${packageName}.${activity}`;
      if (user) Object.assign(app, {user, profile: kinds[user], locked: !!next(2)});
      byKey.set(appKey(app), app);
    }
    const list = [...byKey.values()], described = describeLauncherApps(list);
    const shown = list.map(app => `${app.label.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()}|${described.get(appKey(app)).join('|')}`);
    assert.equal(new Set(shown).size, list.length, JSON.stringify(list.map(app => [appKey(app), app.label, described.get(appKey(app))])));
  }
});
