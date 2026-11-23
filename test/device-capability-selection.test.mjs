// tst-alphaphone-1-015: the device capabilities the phone offers an agent, by platform profile,
// run on the shipped selection.
// Evidence class: unit test of the pure selection; not a device, image or model run.
import test from 'node:test';
import assert from 'node:assert/strict';
import {offeredByEither, selectDeviceCapabilities, TELEPHONY_VIEWS_CAPABILITY} from '../apps/app/src/runtime/phone-context.ts';
import {TELEPHONY_VIEWS_CAPABILITY as SHARED_TELEPHONY_VIEWS} from '../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/contract.ts';

const everything = [
  'calendar.local-event.v1', 'notes.local-record.v1', 'camera.capture-photo.v1', 'reminders.local-record.v1', 'reminders.local-record.v2',
  'calendar.agenda-read.v1', 'notes.query.v1', 'reminders.create.v1', 'calendar.create.v1', 'calendar.next-read.v1', 'maps.selected-read.v1',
  'calendar.availability-read.v1', 'calendar.named-read.v1', 'clock.handoff.v1', 'clock.handoff.v2', 'clock.alarms.v1', 'sms.send.v1',
  'phone.dial.v1', 'notes.search.v1', 'device.named-target.v1',
];
const apk = {android: true, native: true, camera: true, foregroundReview: true, previousNotes: true, clockRepeatDays: true, aospImage: false};
const browser = {android: false, native: false, camera: true, foregroundReview: true, previousNotes: true, clockRepeatDays: false, aospImage: false};
const ios = {android: false, native: true, camera: true, foregroundReview: true, previousNotes: true, clockRepeatDays: false, aospImage: false};

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
  // A capture may name its lens only beside the capture itself, and only when the agent offers the form.
  const withLens=[...everything,'camera.capture-lens.v1'];
  assert.ok(selectDeviceCapabilities(withLens, apk).includes('camera.capture-lens.v1'));
  assert.ok(!selectDeviceCapabilities(withLens, {...apk, camera: false}).includes('camera.capture-lens.v1'));
  assert.ok(!selectDeviceCapabilities(['camera.capture-lens.v1'], apk).includes('camera.capture-lens.v1'));
  assert.ok(!selectDeviceCapabilities(everything, {...apk, foregroundReview: false}).includes('calendar.named-read.v1'), 'no named read before the shell supplies reviews');
  assert.ok(!selectDeviceCapabilities(everything, {...apk, clockRepeatDays: false}).includes('clock.handoff.v2'));
  // The Alpha system image adds SMS and the reviewed dial handoff.
  const image = selectDeviceCapabilities(everything, {...apk, aospImage: true});
  assert.ok(image.includes('sms.send.v1'));
  assert.ok(image.includes('phone.dial.v1'));
  // Phone, Messages and Contacts become agent destinations only on the image, and only when the agent offers them.
  assert.ok(selectDeviceCapabilities([...everything, 'views.telephony.v1'], {...apk, aospImage: true}).includes('views.telephony.v1'));
  assert.ok(!selectDeviceCapabilities([...everything, 'views.telephony.v1'], apk).includes('views.telephony.v1'));
  assert.ok(!image.includes('views.telephony.v1'));
  assert.equal(TELEPHONY_VIEWS_CAPABILITY, SHARED_TELEPHONY_VIEWS);
});

// The Cloud agent's capabilities route lists no calls, contact changes or texts by name; its device
// registration, like the remote and resident agents', lists them. The Cloud connection offers both.
test('a Cloud agent whose registration offers calls and texts by name gets them on the image', () => {
  const route = ['calendar.local-event.v1', 'calendar.agenda-read.v1', 'notes.local-record.v1', 'photos.library.v1', 'reminders.local-record.v1', 'reminders.local-record.v2', 'sms.send.v1'];
  const registration = ['calendar.local-event.v1', 'notes.local-record.v1', 'reminders.local-record.v2', 'sms.send.v1', 'phone.dial.v1', 'phone.call.v1', 'contacts.write.v1', 'sms.compose.v1', 'messages.read.v1', 'voicemail.read.v1', 'voicemail.delete.v1'];
  const telephony = ['phone.dial.v1', 'phone.call.v1', 'contacts.write.v1', 'sms.compose.v1', 'messages.read.v1', 'voicemail.read.v1', 'voicemail.delete.v1'];
  const image = {...apk, aospImage: true, photoLibrary: true};
  const fromRoute = selectDeviceCapabilities(route, image), selected = selectDeviceCapabilities(offeredByEither(route, registration), image);
  for (const capability of telephony) { assert.ok(!fromRoute.includes(capability), `route alone: ${capability}`); assert.ok(selected.includes(capability), capability); }
  // What only the route lists is kept, nothing is offered twice, and a standalone APK still gets no telephony.
  for (const capability of fromRoute) assert.ok(selected.includes(capability), capability);
  assert.equal(new Set(selected).size, selected.length);
  assert.ok(!selectDeviceCapabilities(offeredByEither(route, registration), apk).some(capability => telephony.includes(capability)));
  assert.deepEqual(offeredByEither(undefined, ['a'], 'not a list', ['a', 'b']), ['a', 'b']);
});

// notes.query.v1 reads only the notes saved on this phone before canonical Notes; a phone without
// them never offers a query that could only fail.
test('the Previous notes query is offered only where Previous notes exist', () => {
  for (const profile of [apk, browser, ios]) {
    assert.ok(selectDeviceCapabilities(everything, profile).includes('notes.query.v1'));
    assert.ok(!selectDeviceCapabilities(everything, {...profile, previousNotes: false}).includes('notes.query.v1'));
    assert.ok(!selectDeviceCapabilities([], profile).includes('notes.query.v1'), 'the agent must offer it');
  }
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

// Voice recording has its own capability, so the agent can start a voice note in the agent's own Notes
// without the folder, move and restore set (notes.organize.v1), which is never offered.
test('canonical Notes negotiates voice recording alone, never the organise set', () => {
  const offer = ['notes.record.v1', 'notes.organize.v1', 'notes.list-filter.v1'];
  assert.deepEqual(selectDeviceCapabilities(offer, {...apk, canonicalNotes: true}),
    ['calendar.local-event.v1', 'notes.local-record.v1', 'notes.list-filter.v1', 'notes.record.v1']);
  assert.ok(!selectDeviceCapabilities(offer, apk).includes('notes.record.v1'));
  assert.ok(!selectDeviceCapabilities(offer, {...apk,canonicalNotes:true,foregroundReview:false}).includes('notes.record.v1'));
  assert.ok(!selectDeviceCapabilities(['notes.organize.v1'], {...apk,canonicalNotes:true}).includes('notes.record.v1'));
  for (const profile of [apk, {...apk, canonicalNotes: true}])
    assert.ok(!selectDeviceCapabilities(offer, profile).includes('notes.organize.v1'));
});

test('Files shown targets are offered only beside Files itself (FILE-04)', () => {
  const offer = ['files.browser.v1', 'files.shown-target.v1'];
  assert.deepEqual(selectDeviceCapabilities(offer, {...apk, files: true}).slice(2), offer);
  assert.deepEqual(selectDeviceCapabilities(['files.browser.v1'], {...apk, files: true}).slice(2), ['files.browser.v1']);
  assert.deepEqual(selectDeviceCapabilities(offer, {...apk, files: false}).slice(2), []);
  assert.deepEqual(selectDeviceCapabilities(['files.shown-target.v1'], {...apk, files: true}).slice(2), []);
});
