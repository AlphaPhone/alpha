// Synthetic store, clock, Cloud client and feed only: no browser, Android, OAuth or network.
import assert from 'node:assert/strict';
import { CloudProtocolError, type GoogleCalendarEvent, type GoogleCalendarEventInput, type GoogleCalendarEventPatch } from '../apps/app/src/runtime/cloud-protocol.ts';
import { DELETE_UNDO_MS, type DeletionClock } from '../apps/app/src/runtime/deletion-window.ts';
import { googleCalendarRevision, type GoogleCalendarRead, type GoogleCalendarRecord } from '../apps/app/src/runtime/google-calendar.ts';
import { GoogleCalendarOutbox, GOOGLE_CALENDAR_OUTBOX_LIMIT, googleCalendarChangeApplied, googleCalendarCreateMatch, googleCalendarRetryDelay, keptGoogleCalendarOps, overlayGoogleCalendarRows, type GoogleCalendarOutboxOp, type GoogleCalendarOutboxStore } from '../apps/app/src/runtime/google-calendar-outbox.ts';
import type { GoogleCalendarWriteClient } from '../apps/app/src/runtime/google-calendar-writer.ts';

const grant = '72475cd0-e135-4c42-a9e2-fb5fe0820ada', calendarId = 'owner@example.test', sourceId = `google:${grant}:owner%40example.test`;
const wire = (id: string, patch: Partial<GoogleCalendarEvent> = {}): GoogleCalendarEvent => ({ externalId: id, calendarId, title: 'Standup', description: '', location: '', status: 'confirmed', startAt: '2026-11-06T17:00:00.000Z', endAt: '2026-11-06T17:30:00.000Z', isAllDay: false, timezone: 'UTC', htmlLink: null, conferenceLink: null, organizer: { self: true }, attendees: [], metadata: {}, ...patch });
const row = (event: GoogleCalendarEvent, extra: Partial<GoogleCalendarRecord> = {}): GoogleCalendarRecord => ({
  id: `${sourceId}:${event.externalId}`, calendarId: sourceId, connectionId: grant, providerCalendarId: calendarId, providerEventId: event.externalId,
  title: event.title, body: event.description, location: event.location, begin: Date.parse(event.startAt), end: Date.parse(event.endAt), allDay: false, timeZone: 'UTC',
  revision: googleCalendarRevision(event), source: 'google', writable: true, recurringEventId: (event.metadata.recurringEventId as string) ?? null, htmlLink: null, conferenceLink: null,
  attendees: event.attendees, selfResponse: null, organizerSelf: true, ...extra });

function world(options: { online?: boolean } = {}) {
  let doc: unknown = null;
  const state = { google: new Map<string, GoogleCalendarEvent>(), calls: [] as Array<{ method: string; args: unknown[] }>, reads: 0, online: options.online ?? true,
    fail: null as null | ((method: string) => Error | null), readFail: null as GoogleCalendarRead | null, exchangeFail: null as null | (() => boolean), shown: null as null | GoogleCalendarRecord[], elapsed: 1000, wall: Date.parse('2026-11-06T16:00:00Z'), continuity: 'boot-1', counter: 0 };
  const store: GoogleCalendarOutboxStore = { read: async () => structuredClone(doc), exchange: async (before, value) => { if (state.exchangeFail?.()) throw new Error('storage unavailable'); if (JSON.stringify(before) !== JSON.stringify(doc)) return 'conflict'; doc = structuredClone(value); return 'saved'; } };
  const client: GoogleCalendarWriteClient = {
    async googleCalendarCreateEvent(g, c, input: GoogleCalendarEventInput) { state.calls.push({ method: 'create', args: [g, c, input] }); const e = state.fail?.('create'); if (e) throw e; const made = wire('made_' + (++state.counter), { title: input.title, startAt: new Date(input.startAt).toISOString(), endAt: new Date(input.endAt).toISOString() }); state.google.set(made.externalId, made); return made; },
    async googleCalendarUpdateEvent(g, c, id, patch: GoogleCalendarEventPatch) { state.calls.push({ method: 'update', args: [g, c, id, patch] }); const e = state.fail?.('update'); if (e) throw e; const was = state.google.get(id); if (!was) throw new CloudProtocolError('http', 404); const next = { ...was, ...(patch.title !== undefined ? { title: patch.title } : {}), ...(patch.location !== undefined ? { location: patch.location } : {}), ...(patch.startAt ? { startAt: new Date(patch.startAt).toISOString() } : {}), ...(patch.endAt ? { endAt: new Date(patch.endAt).toISOString() } : {}) }; state.google.set(id, next); return next; },
    async googleCalendarDeleteEvent(g, c, id) { state.calls.push({ method: 'delete', args: [g, c, id] }); const e = state.fail?.('delete'); if (e) throw e; state.google.delete(id); },
  };
  const read = async (id: string): Promise<GoogleCalendarRead> => {
    state.reads++; assert.equal(id, sourceId);
    if (state.readFail) return state.readFail;
    return { status: 'ready', calendar: {} as never, events: [...state.google.values()].map(event => row(event)), syncedAt: new Date().toISOString(), truncated: false };
  };
  const clock = (): DeletionClock => ({ continuity: state.continuity, elapsed: state.elapsed, wall: state.wall + state.elapsed });
  let ids = 0;
  const make = () => new GoogleCalendarOutbox({ owner: 'owner-key', store, client, read, clock, rows: () => state.shown ?? [], now: () => state.wall + state.elapsed, online: () => state.online, id: () => 'id' + (++ids) });
  return { state, make, doc: () => doc as { ops: GoogleCalendarOutboxOp[] } | null, put: (value: unknown) => { doc = structuredClone(value); }, rows: () => [...state.google.values()].map(event => row(event)) };
}
const sends = (w: ReturnType<typeof world>) => w.state.calls.map(call => call.method);
let passed = 0;
async function check(name: string, run: () => Promise<void>) { await run(); console.log(`ok ${++passed} - ${name}`); }

await check('an edit shows at once as waiting to sync, is sent after a fresh check, and keeps showing until the feed catches up', async () => {
  const w = world(), outbox = w.make(), seen: number[] = [];
  w.state.google.set('e1', wire('e1'));
  const before = w.rows()[0];
  outbox.subscribe(ops => seen.push(ops.length));
  const queued = await outbox.enqueue({ kind: 'update', row: before, scope: 'this', fields: { title: 'Planning' } });
  assert.equal(queued.status, 'queued');
  let shown = outbox.overlay([before]);
  assert.equal(shown[0].title, 'Planning'); assert.equal(shown[0].pending, true); assert.equal(w.state.calls.length, 0, 'nothing sent on enqueue');
  await outbox.flush();
  assert.deepEqual(w.state.calls.map(c => [c.method, c.args[2], c.args[3]]), [['update', 'e1', { title: 'Planning' }]]);
  assert.equal(w.state.reads, 1, 'the event was read again before sending');
  shown = outbox.overlay([before]);
  assert.equal(shown[0].title, 'Planning'); assert.equal(shown[0].pending, false, 'sent; the stale row still shows the change');
  const fresh = outbox.overlay(w.rows());
  assert.equal(fresh[0].title, 'Planning'); assert.equal(fresh[0].outboxId, undefined, 'the feed caught up');
  assert.ok(seen.length >= 3, 'subscribers hear every change');
});
await check('a second edit after the first went through starts from Google\'s new version (no self-conflict)', async () => {
  const w = world(), outbox = w.make();
  w.state.google.set('e1', wire('e1'));
  const stale = w.rows()[0];
  await outbox.enqueue({ kind: 'update', row: stale, scope: 'this', fields: { title: 'One' } }); await outbox.flush();
  await outbox.enqueue({ kind: 'update', row: stale, scope: 'this', fields: { location: 'Room 4' } }); await outbox.flush();
  assert.deepEqual(sends(w), ['update', 'update']);
  assert.deepEqual(outbox.operations.filter(op => op.phase === 'conflict'), []);
});
await check('a delete waits out its Undo window; Undo inside it sends nothing', async () => {
  const w = world(), outbox = w.make();
  w.state.google.set('e1', wire('e1'));
  const queued = await outbox.enqueue({ kind: 'delete', row: w.rows()[0], scope: 'this' });
  assert.equal(queued.status, 'queued');
  if (queued.status === 'queued') assert.equal(queued.undoUntil, w.state.wall + 1000 + DELETE_UNDO_MS);
  assert.deepEqual(outbox.overlay(w.rows()), [], 'hidden at once');
  assert.ok(outbox.nextWake()! > 0 && outbox.nextWake()! <= DELETE_UNDO_MS);
  await outbox.flush(); assert.equal(w.state.calls.length, 0, 'nothing sent inside the window');
  if (queued.status === 'queued') assert.equal(await outbox.undo(queued.id), true);
  assert.equal(outbox.overlay(w.rows()).length, 1, 'back after Undo');
  const again = await outbox.enqueue({ kind: 'delete', row: w.rows()[0], scope: 'this' });
  w.state.elapsed += DELETE_UNDO_MS;
  await outbox.flush();
  assert.deepEqual(w.state.calls.map(c => [c.method, c.args[2]]), [['delete', 'e1']]);
  if (again.status === 'queued') assert.equal(await outbox.undo(again.id), false, 'too late once sent');
});
await check('after a restart a waiting delete is paused for Send or Keep', async () => {
  const w = world();
  w.state.google.set('e1', wire('e1')); w.state.google.set('e2', wire('e2', { startAt: '2026-11-06T19:00:00.000Z', endAt: '2026-11-06T19:30:00.000Z' }));
  const first = w.make();
  const [a, b] = w.rows();
  const qa = await first.enqueue({ kind: 'delete', row: a, scope: 'this' }), qb = await first.enqueue({ kind: 'delete', row: b, scope: 'this' });
  w.state.continuity = 'boot-2'; w.state.elapsed = 5;
  const second = w.make();
  await second.load();
  assert.deepEqual(second.operations.map(op => op.phase), ['paused', 'paused']);
  await second.flush(); assert.equal(w.state.calls.length, 0, 'a paused delete is never sent by itself');
  assert.equal(second.overlay(w.rows()).length, 0, 'still hidden while paused');
  if (qa.status === 'queued') assert.equal(await second.resolvePaused(qa.id, 'send'), true);
  await second.flush();
  assert.deepEqual(w.state.calls.map(c => c.args[2]), ['e1']);
  if (qb.status === 'queued') assert.equal(await second.resolvePaused(qb.id, 'keep'), true);
  assert.equal(second.overlay(w.rows()).length, 1, 'kept');
});
await check('unsent changes merge: edits combine, an edit or delete of an unsent create edits or cancels it, a delete replaces edits', async () => {
  const w = world(), outbox = w.make();
  w.state.google.set('e1', wire('e1'));
  const r = w.rows()[0];
  await outbox.enqueue({ kind: 'update', row: r, scope: 'this', fields: { title: 'A' } });
  await outbox.enqueue({ kind: 'update', row: r, scope: 'this', fields: { location: 'B' } });
  assert.equal(outbox.operations.length, 1);
  assert.deepEqual(outbox.operations[0].fields, { title: 'A', location: 'B' });
  await outbox.enqueue({ kind: 'delete', row: r, scope: 'this' });
  assert.deepEqual(outbox.operations.map(op => op.kind), ['delete'], 'the delete replaced the edits');
  const create = await outbox.enqueue({ kind: 'create', sourceId, connectionId: grant, calendarId, fields: { title: 'Lunch', startAt: '2026-11-06T20:00:00Z', endAt: '2026-11-06T21:00:00Z', timeZone: 'UTC' } });
  assert.equal(create.status, 'queued');
  const local = outbox.overlay([]).find(item => item.localId);
  assert.ok(local && local.pending && local.title === 'Lunch');
  await outbox.enqueue({ kind: 'update', row: local!, scope: 'this', fields: { title: 'Late lunch' } });
  assert.equal(outbox.operations.filter(op => op.kind === 'create').length, 1);
  assert.equal(outbox.operations.find(op => op.kind === 'create')!.fields.title, 'Late lunch');
  assert.deepEqual(await outbox.enqueue({ kind: 'delete', row: local!, scope: 'this' }), { status: 'cancelled' });
  assert.equal(outbox.operations.some(op => op.kind === 'create'), false);
});
await check('a change Google beat is a conflict: nothing is sent; Keep mine re-sends on the new version, Keep Google\'s drops it', async () => {
  const w = world(), outbox = w.make();
  w.state.google.set('e1', wire('e1'));
  const r = w.rows()[0];
  const q = await outbox.enqueue({ kind: 'update', row: r, scope: 'this', fields: { title: 'Mine' } });
  w.state.google.set('e1', wire('e1', { title: 'Theirs' }));
  await outbox.flush();
  assert.equal(w.state.calls.length, 0); assert.equal(outbox.operations[0].phase, 'conflict');
  assert.equal(outbox.overlay(w.rows())[0].outboxPhase, 'conflict');
  const later = await outbox.enqueue({ kind: 'rsvp', row: r, response: 'yes' });
  assert.equal(later.status, 'unsupported', 'RSVP is refused while Cloud cannot record it');
  if (q.status === 'queued') assert.equal(await outbox.resolveConflict(q.id, 'mine'), true);
  await outbox.flush();
  assert.deepEqual(w.state.calls.map(c => c.args[3]), [{ title: 'Mine' }]);
  const q2 = await outbox.enqueue({ kind: 'update', row: w.rows()[0], scope: 'this', fields: { title: 'Again' } });
  w.state.google.set('e1', wire('e1', { title: 'Theirs again' }));
  await outbox.flush();
  if (q2.status === 'queued') assert.equal(await outbox.resolveConflict(q2.id, 'google'), true);
  assert.equal(outbox.operations.filter(op => op.phase !== 'done').length, 0);
});
await check('an event missing from the check read: a delete is still sent and Google decides; an edit waits for the owner', async () => {
  const w = world(), outbox = w.make();
  w.state.google.set('e1', wire('e1')); w.state.google.set('e2', wire('e2'));
  const [a, b] = w.rows();
  const u = await outbox.enqueue({ kind: 'update', row: a, scope: 'this', fields: { title: 'x' } });
  const d = await outbox.enqueue({ kind: 'delete', row: b, scope: 'this' });
  w.state.google.clear(); w.state.elapsed += DELETE_UNDO_MS;
  w.state.fail = method => method === 'delete' ? new CloudProtocolError('http', 404) : null;
  await outbox.flush();
  assert.deepEqual(w.state.calls.map(c => [c.method, c.args[2]]), [['delete', 'e2']], 'the delete was sent; the edit was not');
  assert.deepEqual(outbox.operations.map(op => [op.kind, op.phase]), [['update', 'conflict'], ['delete', 'done']]);
  assert.equal(outbox.operations[0].remote, undefined, 'absence from a few days is not proof the event is gone');
  assert.equal(outbox.operations[0].unseen, true);
  if (d.status === 'queued') assert.equal(d.id, outbox.operations[1].id);
  // Keep mine sends it; Google no longer having the event is then known.
  if (u.status === 'queued') assert.equal(await outbox.resolveConflict(u.id, 'mine'), true);
  await outbox.flush();
  assert.deepEqual(sends(w), ['delete', 'update']);
  assert.equal(outbox.operations[0].phase, 'conflict'); assert.equal(outbox.operations[0].remote, null); assert.equal(outbox.operations[0].unseen, undefined);
});
await check('an event moved outside the days read around it: its delete reaches Google instead of being marked done unsent', async () => {
  const w = world(), outbox = w.make();
  w.state.google.set('e1', wire('e1'));
  const shown = w.rows()[0];
  await outbox.enqueue({ kind: 'delete', row: shown, scope: 'this' });
  // Moved a week later in Google: the check read (a day either side) does not return it.
  w.state.readFail = { status: 'ready', calendar: {} as never, events: [], syncedAt: '', truncated: false };
  w.state.elapsed += DELETE_UNDO_MS;
  await outbox.flush();
  assert.deepEqual(w.state.calls.map(c => [c.method, c.args[2]]), [['delete', 'e1']]);
  assert.equal(w.state.google.has('e1'), false); assert.equal(outbox.operations[0].phase, 'done');
});
await check('an edit whose answer was lost is finished when Google already shows it, not raised as a conflict with itself', async () => {
  const w = world(), outbox = w.make();
  w.state.google.set('e1', wire('e1'));
  // The change reaches Google, then the answer is lost.
  w.state.fail = method => { if (method !== 'update') return null; w.state.google.set('e1', wire('e1', { title: 'Mine', location: 'Room 2' })); return new CloudProtocolError('http', 503); };
  await outbox.enqueue({ kind: 'update', row: w.rows()[0], scope: 'this', fields: { title: 'Mine', location: 'Room 2' } });
  await outbox.flush();
  assert.equal(outbox.operations[0].phase, 'queued'); assert.deepEqual(outbox.operations[0].error, { status: 'retryable', applied: 'unknown' });
  w.state.fail = null; w.state.elapsed += googleCalendarRetryDelay(1);
  await outbox.flush();
  assert.equal(outbox.operations[0].phase, 'done', 'no conflict against the owner\'s own change');
  assert.equal(sends(w).length, 1, 'not sent a second time');
  assert.equal(outbox.operations[0].result?.revision, w.rows()[0].revision);
  // Someone else's change in the meantime is still a conflict.
  const v = world(), other = v.make();
  v.state.google.set('e1', wire('e1'));
  v.state.fail = method => { if (method !== 'update') return null; v.state.google.set('e1', wire('e1', { title: 'Theirs' })); return new CloudProtocolError('http', 503); };
  await other.enqueue({ kind: 'update', row: v.rows()[0], scope: 'this', fields: { title: 'Mine' } });
  await other.flush(); v.state.fail = null; v.state.elapsed += googleCalendarRetryDelay(1); await other.flush();
  assert.equal(other.operations[0].phase, 'conflict');
  const applied = (fields: GoogleCalendarOutboxOp['fields'], patch: Partial<GoogleCalendarRecord> = {}) => googleCalendarChangeApplied({ kind: 'update', fields }, { ...row(wire('e1')), ...patch });
  assert.equal(applied({ title: 'Standup' }), true); assert.equal(applied({ title: 'Standup', location: 'x' }), false); assert.equal(applied({}), false, 'nothing to compare proves nothing');
  assert.equal(applied({ startAt: '2026-11-06T17:00:00Z', endAt: '2026-11-06T17:30:00Z' }), true); assert.equal(applied({ startAt: '2026-11-06T18:00:00Z' }), false);
  assert.equal(googleCalendarChangeApplied({ kind: 'rsvp', fields: {}, response: 'maybe' }, { ...row(wire('e1')), selfResponse: 'tentative' }), true);
  assert.equal(googleCalendarChangeApplied({ kind: 'delete', fields: {} }, row(wire('e1'))), false);
});
await check('an unconfirmed create is matched only to one new event with the same title, start and end', async () => {
  const fields = { title: 'Dentist', startAt: '2026-11-07T17:00:00Z', endAt: '2026-11-07T18:00:00Z', timeZone: 'UTC' };
  const same = { title: 'Dentist', startAt: '2026-11-07T17:00:00.000Z', endAt: '2026-11-07T18:00:00.000Z' };
  // An event the owner already had with that title and start is never adopted.
  const w = world(), outbox = w.make();
  w.state.google.set('old', wire('old', same)); w.state.shown = w.rows();
  w.state.fail = method => method === 'create' ? new Error('connection reset') : null;
  await outbox.enqueue({ kind: 'create', sourceId, connectionId: grant, calendarId, fields });
  await outbox.flush(); w.state.fail = null; await outbox.flush();
  assert.equal(outbox.operations[0].phase, 'uncertain', 'the earlier event is not the create');
  assert.deepEqual(outbox.operations[0].existing, ['old']);
  w.state.google.set('new', wire('new', same)); await outbox.flush();
  assert.equal(outbox.operations[0].phase, 'done'); assert.equal(outbox.operations[0].result?.eventId, 'new');
  // Same title and start but another end is a different event.
  const v = world(), second = v.make();
  v.state.fail = method => method === 'create' ? new Error('connection reset') : null;
  await second.enqueue({ kind: 'create', sourceId, connectionId: grant, calendarId, fields });
  await second.flush(); v.state.fail = null;
  v.state.google.set('longer', wire('longer', { ...same, endAt: '2026-11-07T19:00:00.000Z' })); await second.flush();
  assert.equal(second.operations[0].phase, 'uncertain');
  // Two identical unconfirmed creates never share one event, and two candidates are left to the owner.
  const op = (id: string, patch: Partial<GoogleCalendarOutboxOp> = {}): GoogleCalendarOutboxOp => ({ id, kind: 'create', sourceId, connectionId: grant, calendarId, scope: 'this', fields, base: null, localId: 'l' + id, phase: 'uncertain', attempts: 1, createdAt: 1, updatedAt: 1, ...patch });
  const found = row(wire('x', same)), twin = row(wire('y', same));
  assert.equal(googleCalendarCreateMatch(op('a'), [found], [op('a'), op('b')])?.providerEventId, 'x');
  assert.equal(googleCalendarCreateMatch(op('b'), [found], [op('a', { phase: 'done', result: { eventId: 'x', revision: found.revision, begin: found.begin, end: found.end } }), op('b')]), undefined);
  assert.equal(googleCalendarCreateMatch(op('a'), [found, twin], [op('a')]), undefined);
  assert.equal(googleCalendarCreateMatch(op('a'), [found], [op('a'), op('u', { kind: 'update', eventId: 'x', phase: 'queued' })]), undefined, 'an event another change targets existed before');
});
await check('a send whose outcome could not be saved is taken back by the same run, without a restart', async () => {
  const w = world(), outbox = w.make();
  w.state.google.set('e1', wire('e1'));
  const q = await outbox.enqueue({ kind: 'update', row: w.rows()[0], scope: 'this', fields: { title: 'Saved late' } });
  // The claim is saved; saving the result fails.
  let exchanges = 0; w.state.exchangeFail = () => ++exchanges > 1;
  await assert.rejects(outbox.flush());
  assert.equal(w.doc()!.ops[0].phase, 'dispatching', 'left held by this run');
  assert.equal(sends(w).length, 1);
  if (q.status === 'queued') assert.equal(await outbox.undo(q.id).catch(() => false), false);
  assert.ok(outbox.nextWake() !== null, 'a wake is due to take it back');
  w.state.exchangeFail = null;
  await outbox.flush();
  assert.equal(outbox.operations[0].phase, 'done', 'taken back, checked against Google and finished');
  assert.equal(sends(w).length, 1, 'the change Google already has is not sent again');
  assert.equal(outbox.nextWake(), null);
  // A create left the same way may have reached Google: it waits for a match or the owner.
  const v = world(), other = v.make();
  await other.enqueue({ kind: 'create', sourceId, connectionId: grant, calendarId, fields: { title: 'Held', startAt: '2026-11-07T17:00:00Z', endAt: '2026-11-07T18:00:00Z', timeZone: 'UTC' } });
  let saves = 0; v.state.exchangeFail = () => ++saves > 1;
  await assert.rejects(other.flush()); v.state.exchangeFail = null; v.state.google.clear();
  await other.flush();
  assert.equal(other.operations[0].phase, 'uncertain'); assert.deepEqual(sends(v), ['create'], 'never sent twice by itself');
});
await check('stored changes beyond the limit drop the oldest finished ones, never an unsent change', async () => {
  const now = Date.parse('2026-11-06T16:00:00Z') + 1000;
  const op = (id: string, phase: GoogleCalendarOutboxOp['phase'], updatedAt: number): GoogleCalendarOutboxOp => ({ id, kind: 'update', sourceId, connectionId: grant, calendarId, eventId: id, scope: 'this', fields: { title: id }, base: { revision: 'r', begin: 1, end: 2 }, phase, attempts: 0, createdAt: updatedAt, updatedAt });
  const done = Array.from({ length: GOOGLE_CALENDAR_OUTBOX_LIMIT - 10 }, (_, i) => op('done' + i, 'done', now - 60_000 + i));
  const queued = Array.from({ length: 30 }, (_, i) => op('open' + i, 'queued', now));
  const expired = op('expired', 'done', now - 11 * 60_000);
  const kept = keptGoogleCalendarOps([expired, ...done, ...queued], now);
  assert.equal(kept.length, GOOGLE_CALENDAR_OUTBOX_LIMIT);
  assert.equal(kept.filter(item => item.phase === 'queued').length, 30, 'every unsent change is kept');
  assert.equal(kept.includes(expired), false); assert.equal(kept.includes(done[0]), false, 'the oldest finished change made room'); assert.equal(kept.includes(done.at(-1)!), true);
  assert.deepEqual(kept.map(item => item.id), [...done.slice(20), ...queued].map(item => item.id), 'order is kept');
  // Through the store: the newest change survives a load and the next save.
  const w = world({ online: false }), outbox = w.make();
  w.put({ version: 1, owner: 'owner-key', ops: [...done, ...queued] });
  await outbox.load();
  assert.equal(outbox.operations.filter(item => item.phase === 'queued').length, 30);
  assert.equal(await outbox.undo('open0'), true);
  assert.equal(w.doc()!.ops.some(item => item.id === 'open29'), true, 'the newest unsent change is still stored');
});
await check('a view that detaches before the outbox has loaded sends nothing', async () => {
  const w = world(), first = w.make();
  for (const title of ['One', 'Two']) await first.enqueue({ kind: 'create', sourceId, connectionId: grant, calendarId, fields: { title, startAt: '2026-11-07T17:00:00Z', endAt: '2026-11-07T18:00:00Z', timeZone: 'UTC' } });
  const outbox = w.make();
  outbox.attach({ addEventListener() {}, removeEventListener() {} })();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.deepEqual(sends(w), [], 'the account switched while the document was being read');
  assert.deepEqual(w.doc()!.ops.map(op => op.phase), ['queued', 'queued']);
});
await check('changes Google refused for want of permission are queued again once the owner allowed changes', async () => {
  const w = world(), outbox = w.make();
  w.state.google.set('e1', wire('e1')); w.state.google.set('e2', wire('e2', { startAt: '2026-11-06T19:00:00.000Z', endAt: '2026-11-06T19:30:00.000Z' }));
  const [a, b] = w.rows();
  w.state.fail = () => new CloudProtocolError('http', 403);
  await outbox.enqueue({ kind: 'update', row: a, scope: 'this', fields: { title: 'Allowed later' } });
  await outbox.enqueue({ kind: 'update', row: b, scope: 'this', fields: { title: '' } });
  await outbox.flush();
  assert.deepEqual(outbox.operations.map(op => [op.phase, op.error?.status]), [['failed', 'needs-permission'], ['failed', 'needs-permission']]);
  assert.equal(await outbox.retryPermission(['another-grant']), 0, 'only the connection that was allowed');
  w.state.fail = method => method === 'update' && w.state.calls.at(-1)?.args[2] === 'e2' ? new CloudProtocolError('http', 400) : null;
  assert.equal(await outbox.retryPermission([grant]), 2);
  await outbox.flush();
  assert.deepEqual(outbox.operations.map(op => [op.phase, op.error?.status]), [['done', undefined], ['failed', 'invalid']], 'a change refused for another reason stays failed');
  assert.equal(w.state.google.get('e1')!.title, 'Allowed later');
  assert.equal(await outbox.retryPermission([grant]), 0);
});
await check('a create whose answer was lost is never sent again by itself; a matching feed event settles it', async () => {
  const w = world(), outbox = w.make();
  let lose = true;
  w.state.fail = method => method === 'create' && lose ? new Error('connection reset') : null;
  const fields = { title: 'Dentist', startAt: '2026-11-07T17:00:00Z', endAt: '2026-11-07T18:00:00Z', timeZone: 'UTC' };
  const q = await outbox.enqueue({ kind: 'create', sourceId, connectionId: grant, calendarId, fields });
  await outbox.flush();
  assert.equal(outbox.operations[0].phase, 'uncertain');
  lose = false; await outbox.flush();
  assert.equal(sends(w).length, 1, 'no automatic retry');
  w.state.google.set('found', wire('found', { title: 'Dentist', startAt: '2026-11-07T17:00:00.000Z', endAt: '2026-11-07T18:00:00.000Z' }));
  await outbox.flush();
  assert.equal(outbox.operations[0].phase, 'done'); assert.equal(outbox.operations[0].result?.eventId, 'found');
  // Not found: the owner decides.
  const q2 = await outbox.enqueue({ kind: 'create', sourceId, connectionId: grant, calendarId, fields: { ...fields, title: 'Gym' } });
  lose = true; await outbox.flush(); lose = false; await outbox.flush();
  const gym = outbox.operations.find(op => op.fields.title === 'Gym')!;
  assert.equal(gym.phase, 'uncertain');
  if (q2.status === 'queued') assert.equal(await outbox.resolveUncertain(q2.id, 'send'), true);
  await outbox.flush();
  assert.equal(outbox.operations.find(op => op.fields.title === 'Gym')!.phase, 'done');
  assert.equal(q.status, 'queued');
});
await check('offline, signed out and refused changes', async () => {
  const w = world({ online: false }), outbox = w.make();
  w.state.google.set('e1', wire('e1'));
  await outbox.enqueue({ kind: 'update', row: w.rows()[0], scope: 'this', fields: { title: 'x' } });
  await outbox.flush(); assert.equal(w.state.reads + w.state.calls.length, 0, 'offline sends nothing');
  w.state.online = true; w.state.readFail = { status: 'not-connected', message: 'signed out' };
  await outbox.flush(); assert.equal(outbox.operations[0].phase, 'queued'); assert.deepEqual(outbox.operations[0].error, { status: 'signed-out' });
  w.state.readFail = null; w.state.fail = () => new CloudProtocolError('http', 403);
  await outbox.flush(); assert.equal(outbox.operations[0].phase, 'failed'); assert.deepEqual(outbox.operations[0].error, { status: 'needs-permission' });
  const flagged = outbox.overlay(w.rows())[0];
  assert.equal(flagged.title, 'Standup', 'a refused change is not shown as applied'); assert.equal(flagged.outboxPhase, 'failed');
  assert.equal(await outbox.dismiss(outbox.operations[0].id), true); assert.equal(outbox.operations.length, 0);
  w.state.fail = () => new CloudProtocolError('http', 503);
  await outbox.enqueue({ kind: 'update', row: w.rows()[0], scope: 'this', fields: { title: 'y' } });
  await outbox.flush(); assert.equal(outbox.operations[0].phase, 'queued', 'retryable stays queued'); assert.equal(outbox.operations[0].attempts, 1);
});
await check('an interrupted send recovers on the next start: a create becomes uncertain, an edit is checked again', async () => {
  const w = world(), outbox = w.make();
  w.state.google.set('e1', wire('e1'));
  await outbox.enqueue({ kind: 'create', sourceId, connectionId: grant, calendarId, fields: { title: 'A', startAt: '2026-11-07T17:00:00Z', endAt: '2026-11-07T18:00:00Z', timeZone: 'UTC' } });
  await outbox.enqueue({ kind: 'update', row: w.rows()[0], scope: 'this', fields: { title: 'B' } });
  const doc = w.doc()!; for (const op of doc.ops) { op.phase = 'dispatching'; op.holder = 'crashed'; }
  w.state.elapsed += 3 * 60_000;
  const restarted = w.make(); await restarted.load();
  assert.deepEqual(restarted.operations.map(op => [op.kind, op.phase]), [['create', 'uncertain'], ['update', 'queued']]);
});
await check('overlay: series delete hides every occurrence, RSVP sets the owner\'s answer, local creates are added', () => {
  const series = { metadata: { recurringEventId: 'series' } };
  const rows = [row(wire('s1', series)), row(wire('s2', { ...series, startAt: '2026-11-07T17:00:00.000Z', endAt: '2026-11-07T17:30:00.000Z' })), row(wire('solo', { attendees: [{ email: 'me@example.test', displayName: null, responseStatus: 'needsAction', self: true, organizer: false, optional: false }] }))];
  const base = { revision: rows[0].revision, begin: rows[0].begin, end: rows[0].end };
  const op = (patch: Partial<GoogleCalendarOutboxOp>): GoogleCalendarOutboxOp => ({ id: 'op-' + Math.random(), kind: 'update', sourceId, connectionId: grant, calendarId, scope: 'this', fields: {}, base, phase: 'queued', attempts: 0, createdAt: 1, updatedAt: 1, ...patch });
  const shown = overlayGoogleCalendarRows(rows, [
    op({ kind: 'delete', eventId: 's1', recurringEventId: 'series', scope: 'all' }),
    op({ kind: 'rsvp', eventId: 'solo', response: 'maybe', base: { revision: rows[2].revision, begin: rows[2].begin, end: rows[2].end } }),
    op({ kind: 'create', localId: 'l1', base: null, fields: { title: 'New', startAt: '2026-11-08T10:00:00Z', endAt: '2026-11-08T11:00:00Z', timeZone: 'UTC' } }),
  ]);
  assert.deepEqual(shown.map(r => [r.providerEventId || r.localId, r.pending]), [['solo', true], ['l1', true]]);
  assert.equal(shown[0].selfResponse, 'tentative'); assert.equal(shown[0].attendees[0].responseStatus, 'tentative');
  return Promise.resolve();
});
await check(`at most ${GOOGLE_CALENDAR_OUTBOX_LIMIT} changes wait`, async () => {
  const w = world({ online: false }), outbox = w.make();
  for (let i = 0; i < GOOGLE_CALENDAR_OUTBOX_LIMIT; i++) {
    const result = await outbox.enqueue({ kind: 'create', sourceId, connectionId: grant, calendarId, fields: { title: 'E' + i, startAt: '2026-11-07T17:00:00Z', endAt: '2026-11-07T18:00:00Z', timeZone: 'UTC' } });
    if (result.status !== 'queued') { assert.equal(result.status, 'full'); assert.ok(i > 50, 'the byte bound leaves room for many changes'); return; }
  }
  assert.equal((await outbox.enqueue({ kind: 'create', sourceId, connectionId: grant, calendarId, fields: { title: 'Over', startAt: '2026-11-07T17:00:00Z', endAt: '2026-11-07T18:00:00Z', timeZone: 'UTC' } })).status, 'full');
});
await check('two changes to one event queued in the same millisecond are both sent, in the order they were made', async () => {
  const w = world(), outbox = w.make();
  w.state.google.set('e1', wire('e1'));
  const r = w.rows()[0];
  await outbox.enqueue({ kind: 'update', row: r, scope: 'this', fields: { title: 'First' } });
  await outbox.enqueue({ kind: 'update', row: r, scope: 'all', fields: { location: 'Second' } });
  assert.equal(new Set(outbox.operations.map(op => op.createdAt)).size, 1, 'the clock did not move');
  await outbox.flush();
  assert.deepEqual(w.state.calls.map(c => c.args[3]), [{ title: 'First' }, { location: 'Second' }]);
  assert.deepEqual(outbox.operations.map(op => op.phase), ['done', 'done']);
  assert.equal(outbox.overlay(w.rows()).some(item => item.pending), false, 'no dot left behind');
});
await check('a send left unfinished by a run that ended moments ago is taken back in this session once it is stale', async () => {
  const w = world(), first = w.make();
  w.state.google.set('e1', wire('e1'));
  await first.enqueue({ kind: 'update', row: w.rows()[0], scope: 'this', fields: { title: 'Again' } });
  const doc = w.doc()!; doc.ops[0].phase = 'dispatching'; doc.ops[0].holder = 'killed';
  w.state.elapsed += 10_000;
  const reopened = w.make(); await reopened.load();
  assert.equal(reopened.operations[0].phase, 'dispatching', 'too recent to take back at start');
  await reopened.flush(); assert.equal(w.state.calls.length, 0);
  const wake = reopened.nextWake();
  assert.ok(wake !== null && wake > 0 && wake <= 2 * 60_000 - 10_000, 'a wake is due when it turns stale');
  w.state.elapsed += wake!;
  await reopened.flush();
  assert.deepEqual(w.state.calls.map(c => [c.method, c.args[3]]), [['update', { title: 'Again' }]]);
  assert.equal(reopened.operations[0].phase, 'done');
});
await check('a whole-series delete is sent even when the occurrence the owner tapped is gone', async () => {
  const w = world(), outbox = w.make();
  w.state.google.set('s1', wire('s1', { metadata: { recurringEventId: 'series' } }));
  w.state.google.set('s2', wire('s2', { metadata: { recurringEventId: 'series' }, startAt: '2026-11-07T17:00:00.000Z', endAt: '2026-11-07T17:30:00.000Z' }));
  await outbox.enqueue({ kind: 'delete', row: w.rows()[0], scope: 'all' });
  w.state.google.delete('s1'); w.state.elapsed += DELETE_UNDO_MS;
  await outbox.flush();
  assert.deepEqual(w.state.calls.map(c => [c.method, c.args[2]]), [['delete', 'series']]);
  assert.equal(outbox.operations[0].phase, 'done');
  // Google answering "gone" for the series also finishes it.
  const v = world(), again = v.make();
  v.state.google.set('s1', wire('s1', { metadata: { recurringEventId: 'series' } }));
  await again.enqueue({ kind: 'delete', row: v.rows()[0], scope: 'all' });
  v.state.google.clear(); v.state.elapsed += DELETE_UNDO_MS; v.state.fail = () => new CloudProtocolError('http', 404);
  await again.flush();
  assert.deepEqual(sends(v), ['delete']); assert.equal(again.operations[0].phase, 'done');
});
await check('a create answered after the Cloud account changed may have reached Google: it is never sent again by itself', async () => {
  const w = world(), outbox = w.make();
  let switched = true;
  w.state.fail = method => method === 'create' && switched ? new CloudProtocolError('account-changed') : null;
  await outbox.enqueue({ kind: 'create', sourceId, connectionId: grant, calendarId, fields: { title: 'Call', startAt: '2026-11-07T17:00:00Z', endAt: '2026-11-07T18:00:00Z', timeZone: 'UTC' } });
  await outbox.flush();
  assert.equal(outbox.operations[0].phase, 'uncertain');
  switched = false; await outbox.flush();
  assert.deepEqual(sends(w), ['create'], 'no duplicate create');
});
await check('detaching the last view stops a running send before the next change', async () => {
  const w = world(), outbox = w.make();
  const detach = outbox.attach({ addEventListener() {}, removeEventListener() {} });
  await outbox.flush();
  for (const title of ['One', 'Two', 'Three']) await outbox.enqueue({ kind: 'create', sourceId, connectionId: grant, calendarId, fields: { title, startAt: '2026-11-07T17:00:00Z', endAt: '2026-11-07T18:00:00Z', timeZone: 'UTC' } });
  w.state.fail = method => { if (method === 'create') detach(); return null; };
  await outbox.flush();
  assert.deepEqual(sends(w), ['create'], 'the account switched after the first send');
  assert.deepEqual(outbox.operations.map(op => op.phase), ['done', 'queued', 'queued'], 'nothing is lost or misfiled');
  w.state.fail = null;
  await outbox.flush();
  assert.deepEqual(sends(w), ['create', 'create', 'create'], 'sent once the outbox is used again');
});
await check('a passing failure is retried on a timer with backoff, not only on the next online or focus event', async () => {
  const w = world(), outbox = w.make();
  w.state.google.set('e1', wire('e1'));
  w.state.fail = () => new CloudProtocolError('http', 503);
  await outbox.enqueue({ kind: 'update', row: w.rows()[0], scope: 'this', fields: { title: 'Later' } });
  await outbox.flush();
  assert.equal(outbox.operations[0].phase, 'queued');
  assert.equal(outbox.nextWake(), googleCalendarRetryDelay(1), 'a wake is scheduled for the retry');
  w.state.fail = null;
  await outbox.flush(); assert.equal(w.state.calls.length, 1, 'not before the retry is due');
  w.state.elapsed += googleCalendarRetryDelay(1);
  await outbox.flush();
  assert.equal(w.state.calls.length, 2); assert.equal(outbox.operations[0].phase, 'done'); assert.equal(outbox.nextWake(), null);
  assert.deepEqual([1, 2, 3, 30].map(googleCalendarRetryDelay), [5_000, 10_000, 20_000, 5 * 60_000]);
});
console.log(`${passed} synthetic Google Calendar outbox checks passed; no device or live Cloud acceptance claimed.`);
