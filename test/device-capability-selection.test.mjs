// tst-alphaphone-1-015: the device capabilities the phone offers an agent, by platform profile,
// run on the shipped selection.
// Evidence class: unit test of the pure selection; not a device, image or model run.
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectDeviceCapabilities} from '../apps/app/src/runtime/phone-context.ts';
import {readFileSync} from 'node:fs';

const everything = [
  'calendar.local-event.v1', 'notes.local-record.v1', 'camera.capture-photo.v1', 'reminders.local-record.v1', 'reminders.local-record.v2',
  'calendar.agenda-read.v1', 'notes.query.v1', 'reminders.create.v1', 'calendar.create.v1', 'calendar.next-read.v1', 'maps.selected-read.v1',
  'calendar.availability-read.v1', 'calendar.named-read.v1', 'clock.handoff.v1', 'clock.handoff.v2', 'clock.alarms.v1', 'sms.send.v1',
  'phone.dial.v1', 'notes.search.v1', 'device.named-target.v1',
];
const apk = {android: true, native: true, camera: true, foregroundReview: true, clockRepeatDays: true, aospImage: false};
const browser = {android: false, native: false, camera: true, foregroundReview: true, clockRepeatDays: false, aospImage: false};
const ios = {android: false, native: true, camera: true, foregroundReview: true, clockRepeatDays: false, aospImage: false};

test('each platform profile offers only what it can run', () => {
  const rows = [
    ['Android APK', apk, ['calendar.local-event.v1', 'notes.local-record.v1', 'camera.capture-photo.v1', 'reminders.local-record.v2', 'notes.query.v1', 'reminders.create.v1', 'calendar.create.v1', 'calendar.next-read.v1', 'maps.selected-read.v1', 'calendar.availability-read.v1', 'calendar.named-read.v1']],
    ['browser', browser, ['calendar.local-event.v1', 'notes.local-record.v1', 'camera.capture-photo.v1', 'reminders.local-record.v2', 'calendar.agenda-read.v1', 'notes.query.v1', 'calendar.create.v1', 'calendar.next-read.v1', 'maps.selected-read.v1', 'calendar.availability-read.v1', 'calendar.named-read.v1']],
    ['iOS', ios, ['calendar.local-event.v1', 'notes.local-record.v1', 'camera.capture-photo.v1', 'reminders.local-record.v2', 'notes.query.v1', 'reminders.create.v1', 'calendar.create.v1', 'maps.selected-read.v1', 'calendar.availability-read.v1']],
  ];
  for (const [name, profile, expected] of rows) {
    const selected = selectDeviceCapabilities(everything, profile);
    // Clock handoffs come from the shared policy; only their platform gate is checked here.
    assert.deepEqual(selected.filter(capability => !capability.startsWith('clock.')), expected, name);
    assert.equal(selected.some(capability => capability.startsWith('clock.')), profile.android, `${name}: Clock handoffs only on Android`);
    assert.ok(!selected.includes('clock.alarms.v1'), `${name}: never clock.alarms.v1 (P-17)`);
    for (const capability of ['notes.search.v1', 'device.named-target.v1', 'sms.send.v1', 'phone.dial.v1']) assert.ok(!selected.includes(capability), `${name}: ${capability}`);
  }
});

test('the agent must offer a capability, and platform gates still apply', () => {
  assert.deepEqual(selectDeviceCapabilities(undefined, apk), ['calendar.local-event.v1', 'notes.local-record.v1']);
  assert.deepEqual(selectDeviceCapabilities(['reminders.local-record.v1'], apk).slice(2), ['reminders.local-record.v1']);
  assert.ok(!selectDeviceCapabilities(everything, {...apk, camera: false}).includes('camera.capture-photo.v1'));
  assert.ok(!selectDeviceCapabilities(everything, {...apk, foregroundReview: false}).includes('calendar.named-read.v1'), 'no named read before the shell supplies reviews');
  assert.ok(!selectDeviceCapabilities(everything, {...apk, clockRepeatDays: false}).includes('clock.handoff.v2'));
  // The Alpha system image adds SMS and the reviewed dial handoff.
  const image = selectDeviceCapabilities(everything, {...apk, aospImage: true});
  assert.ok(image.includes('sms.send.v1'));
  assert.ok(image.includes('phone.dial.v1'));
});

test('canonical Notes negotiates only the exact foreground list filter', () => {
  const capability = 'notes.list-filter.v1';
  const offer = [capability, 'notes.organize.v1', 'notes.search.v1'];
  assert.deepEqual(selectDeviceCapabilities(offer, {...apk, canonicalNotes: true}),
    ['calendar.local-event.v1', 'notes.local-record.v1', capability]);
  assert.ok(!selectDeviceCapabilities(offer, apk).includes(capability));
  assert.ok(!selectDeviceCapabilities(offer, {...apk,canonicalNotes:true,foregroundReview:false}).includes(capability));
  assert.ok(!selectDeviceCapabilities([], {...apk,canonicalNotes:true}).includes(capability));
});

// Source contract on connection-ui.tsx: only the resident connection, which owns canonical app
// records, selects with canonicalNotes. Remote and Cloud enrollments never advertise the filter.
test('only the resident connection may negotiate the canonical Notes filter', () => {
  const ui = readFileSync(new URL('../apps/app/src/runtime/connection-ui.tsx', import.meta.url), 'utf8');
  const body = name => { const from = ui.indexOf(`\nasync function ${name}(`); assert.ok(from >= 0, name); const to = ui.indexOf('\nasync function ', from + 1); return ui.slice(from, to < 0 ? undefined : to); };
  const calls = name => [...body(name).matchAll(/deviceCapabilities\(([^()]*(?:\([^()]*\))?[^()]*)\)/g)].map(match => match[1]);
  assert.deepEqual(calls('connectResident'), ['registered.capabilities,true']);
  assert.deepEqual(calls('connectRemote'), ['registered.capabilities']);
  assert.deepEqual(calls('connectCloud'), ['device?.capabilities']);
  assert.equal([...ui.matchAll(/deviceCapabilities\([^)]*,\s*true\)/g)].length, 1);
  assert.ok(!body('connectRemote').includes('NOTES_LIST_FILTER_CAPABILITY') && !body('connectCloud').includes('NOTES_LIST_FILTER_CAPABILITY'));
  assert.ok(!body('connectRemote').includes('notes.list-filter.v1') && !body('connectCloud').includes('notes.list-filter.v1'));
});
