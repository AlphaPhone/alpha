// Alpha's Calendar sync status line (apps/app/src/ui/calendar/sync-host.ts) words every refusal
// itself. The shared sync's refusals and the plain errors of Alpha's own sync runtime (browser
// calendar source, linked-sync port, field mapping, deletion journal, checkpoint storage and the
// device Calendar bridge's reply checks) each keep their specific reason in Alpha's words; a
// `CalendarSyncNotice` is shown as written; only an unknown error gets the generic sentence. Each
// mapping is pinned against the text its module still throws, so a reworded refusal cannot fall
// silently to the generic sentence that points the owner at Google.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CalendarSyncNotice, createCalendarSyncHost} from '../apps/app/src/ui/calendar/sync-host.ts';

const GENERIC = 'Sync stopped. Check the selected Google calendar before retrying.';

/** The status the host shows after a review whose preparation throws `error`. */
async function statusFor(error) {
  const host = createCalendarSyncHost({
    prepare: async () => { throw error; },
    settings: {read: async () => null, edit: async () => {}},
    target: () => ({environment: 'production', userId: 'owner', organizationId: 'org', connectionId: 'grant', calendarId: 'primary', agentId: 'agent'}),
    identity: () => 'owner',
    foreground: () => true,
    source: async () => ({revision: 'r'}),
    storage: {read: async () => null, compareExchange: async () => ({status: 'saved'})},
  });
  await assert.rejects(host.review());
  return host.snapshot().status;
}

// [module that throws it, its exact text, the sentence the owner sees]
const LOCAL = [
  ['apps/app/src/browser/calendar-store.ts', 'The local calendar needs recovery.', 'The local calendar needs recovery before syncing.'],
  ['apps/app/src/browser/json-domain-document.ts', 'Browser history needs recovery', 'Saved data in this browser needs recovery before syncing.'],
  ['apps/app/src/browser/calendar-linked-local.ts', 'This local event needs recovery before syncing.', 'This local event needs recovery before syncing.'],
  ['apps/app/src/browser/calendar-linked-local.ts', 'The all-day event dates need review.', "An all-day event's dates need review before syncing."],
  ['apps/app/src/browser/calendar-linked-local.ts', 'Deletion pending', 'A deletion is pending for this event. Sync again after it finishes or is undone.'],
  ['apps/app/src/browser/calendar-linked-local.ts', 'Unsupported event', 'Google sent an event this phone cannot save locally. Nothing was applied.'],
  ['apps/app/src/browser/calendar-linked-local.ts', 'Review whole all-day dates before syncing.', 'Review whole all-day dates before syncing.'],
  ['apps/app/src/browser/calendar-linked-local.ts', 'Missing time zone', 'Google sent a timed event without its time zone. Nothing was applied.'],
  ['apps/app/src/browser/calendar-linked-local.ts', 'The local event changed before sync could apply.', 'The local event changed before sync could apply.'],
  ['apps/app/src/browser/calendar-linked-local.ts', 'The local event or owner changed before deletion.', 'The local event or owner changed before deletion.'],
  ['apps/app/src/browser/calendar-sync-fields.ts', 'Email needed', 'A guest needs an email address before syncing.'],
  ['apps/app/src/browser/calendar-sync-fields.ts', 'Duplicate guest', 'A guest is listed twice. Review the guest list before syncing.'],
  ['apps/app/src/browser/calendar-sync-fields.ts', 'Review the Google guest list before syncing.', 'Review the Google guest list before syncing.'],
  ['apps/app/src/browser/calendar-sync-fields.ts', 'Google returned duplicate attendees.', 'Google listed the same guest twice. Review the guest list before syncing.'],
  ['apps/app/src/browser/calendar-sync-fields.ts', 'Sync series', 'One changed occurrence of a repeating event cannot be synced on its own.'],
  ['apps/app/src/browser/calendar-sync-fields.ts', 'Unsupported repeat', 'This repeat rule cannot be synced.'],
  ['apps/app/src/browser/calendar-sync-fields.ts', 'Review the excluded occurrence dates.', 'Review the skipped occurrence dates before syncing.'],
  ['apps/app/src/browser/calendar-sync-fields.ts', 'Multiple recurrence rules need review. Nothing changed.', 'Multiple repeat rules need review. Nothing changed.'],
  ['apps/app/src/browser/calendar-sync-fields.ts', 'This Google repeat rule cannot be represented locally.', 'This Google repeat rule cannot be kept on this phone.'],
  ['apps/app/src/browser/calendar-sync-fields.ts', 'This Google exclusion date needs review.', 'A skipped date from Google needs review.'],
  ['apps/app/src/browser/calendar-sync-fields.ts', 'This Google exclusion date is invalid.', 'A skipped date from Google is not valid.'],
  ['apps/app/src/browser/calendar-sync-fields.ts', 'Repeat rule missing', 'Google sent skipped dates without a repeat rule.'],
  ['apps/app/src/browser/calendar-deletions.ts', 'This event already has a pending deletion.', 'This event already has a pending deletion.'],
  ['apps/app/src/browser/calendar-deletions.ts', 'Deletion identity already used.', 'This deletion was already recorded. Check pending deletions.'],
  ['apps/app/src/browser/calendar-deletions.ts', 'Pending deletion history requires review.', 'Pending deletion history needs review.'],
  ['apps/app/src/browser/calendar-records.ts', 'Calendar series changed.', 'The repeating event changed. Sync again to review it.'],
  ['apps/app/src/runtime/calendar-linked-storage.ts', 'Invalid Calendar sync checkpoint slot', 'Calendar sync records could not be opened.'],
  ['apps/app/src/runtime/calendar-linked-storage.ts', 'Calendar sync checkpoint limit reached', 'Calendar sync reached its storage limit. The latest sync record was not saved.'],
  ['apps/app/src/runtime/native-calendar-sync.ts', 'Device Calendar sync requires Android', 'Device Calendar sync is available only on Android.'],
  ['apps/app/src/runtime/native-calendar-sync.ts', 'Invalid device Calendar response', 'The device Calendar returned a reply this phone could not use.'],
  ['apps/app/src/runtime/native-calendar-sync.ts', 'Device Calendar event list needs review', 'The device Calendar event list needs review.'],
  ['apps/app/src/runtime/native-calendar-sync.ts', 'Invalid device Calendar identity', 'The device Calendar returned an event list this phone could not use.'],
  ['apps/app/src/runtime/native-calendar-sync.ts', 'Device Calendar destination changed', 'The device Calendar destination changed. Review sync again.'],
  ['apps/app/src/runtime/native-calendar-sync.ts', 'Invalid device Calendar event', 'The device Calendar returned an event this phone could not use.'],
  ['apps/app/src/runtime/native-calendar-sync.ts', 'Invalid device Calendar guest', 'The device Calendar returned an event this phone could not use.'],
  ['apps/app/src/runtime/native-calendar-sync.ts', 'Invalid device Calendar recurrence', 'The device Calendar returned an event this phone could not use.'],
  ['apps/app/src/runtime/native-calendar-sync.ts', 'Invalid native Calendar recovery receipt', 'The device Calendar returned a recovery receipt this phone could not use.'],
  ['apps/app/src/runtime/native-calendar-sync.ts', 'Calendar deletion readback changed', 'The device Calendar still shows the deleted event. Check it before retrying.'],
];

/** Plain-error texts a module throws (`throw Error("…")` or `throw new Error("…")`). */
const plainThrows = file => [...fs.readFileSync(file, 'utf8')
  .matchAll(/throw\s+(?:new\s+)?Error\(\s*(['"])((?:(?!\1).)+)\1/g)].map(match => match[2]);

test('each local sync refusal keeps its own reason in Alpha words, never the Google fallback', async () => {
  for (const [file, thrown, shown] of LOCAL) {
    assert.ok(plainThrows(file).includes(thrown), `${file} still throws ${JSON.stringify(thrown)}`);
    assert.equal(await statusFor(Error(thrown)), shown, thrown);
    assert.notEqual(shown, GENERIC);
  }
});

test('every plain refusal of the browser sync source, field mapping, checkpoint storage and device bridge is worded', async () => {
  const covered = new Set(LOCAL.map(([, thrown]) => thrown));
  for (const file of [
    'apps/app/src/browser/calendar-store.ts',
    'apps/app/src/browser/json-domain-document.ts',
    'apps/app/src/browser/calendar-linked-local.ts',
    'apps/app/src/browser/calendar-sync-fields.ts',
    'apps/app/src/browser/calendar-records.ts',
    'apps/app/src/runtime/calendar-linked-storage.ts',
    'apps/app/src/runtime/native-calendar-sync.ts',
  ]) for (const thrown of plainThrows(file)) {
    assert.ok(covered.has(thrown), `${file}: ${JSON.stringify(thrown)} has an Alpha sentence`);
    assert.notEqual(await statusFor(Error(thrown)), GENERIC, thrown);
  }
});

test('a CalendarSyncNotice is shown as written', async () => {
  assert.equal(await statusFor(new CalendarSyncNotice('Choose a Google calendar for sync first.')), 'Choose a Google calendar for sync first.');
  assert.equal(await statusFor(new CalendarSyncNotice('Allow Calendar access to review device sync.')), 'Allow Calendar access to review device sync.');
});

test('shared sync refusals keep their reason in Alpha words', async () => {
  for (const [thrown, shown] of [
    ['Calendar sync supports up to 2,000 linked local events. Nothing changed.', 'Calendar sync links at most 2,000 local events. Nothing changed.'],
    ['Calendar sync link limit reached. No new events were linked.', 'Calendar sync reached its link limit. No new events were linked.'],
    ['Choose a currently listed Google calendar.', 'Choose a Google calendar that is still listed.'],
    ['Calendar sync settings changed. Review them again.', 'Calendar sync settings changed. Review them again.'],
  ]) assert.equal(await statusFor(Error(thrown)), shown);
});

test('an unknown event time zone is named; other unknown errors get the generic sentence', async () => {
  let rangeError;
  try { new Intl.DateTimeFormat('en-US', {timeZone: 'Not/AZone'}).format(); } catch (error) { rangeError = error; }
  assert.ok(rangeError instanceof RangeError);
  assert.equal(await statusFor(rangeError), "An event's time zone is not recognized. Review the event before syncing.");
  assert.equal(await statusFor(Error('Something nobody worded')), GENERIC);
  assert.equal(await statusFor(new RangeError('Invalid array length')), GENERIC);
  assert.equal(await statusFor(new DOMException('Calendar sync context changed', 'AbortError')),
    'Sync paused or the selected account changed. Check linked events before retrying.');
});
