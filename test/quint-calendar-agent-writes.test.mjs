import assert from 'node:assert/strict';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {checkTraces} from '../specs/quint/refinement/check-traces.mjs';
import {boundInputs, call, captureSources, checkpoint, deferred, read, tick, trace} from '../specs/quint/refinement/application/support.mjs';
import {deviceExecutorSources, mountDeviceExecutor, proposalAllowed, settled} from '../specs/quint/refinement/application/device-action-executor.mjs';
import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';

// CalendarAgentWrites refinement: the installed device executor's phone Calendar branch, with the
// coordinator's real context gate deciding approval. AlphaCalendar is a port that holds each native
// review open until the trace settles it with a status the TypeScript call site handles; the Java
// executor itself is not driven here.
const driver = fileURLToPath(import.meta.url);
const coordinator = 'apps/app/src/ui/device-actions/client-coordinator.ts';
const sourceId = 'device-calendar', sourceRevision = 'a'.repeat(64), eventId = 'event-1';
const revisions = ['b'.repeat(64), 'c'.repeat(64)];
const fields = {title: 'Synthetic event', description: '', location: '', start: '2030-01-01T10:00:00.000Z',
  end: '2030-01-01T11:00:00.000Z', timeZone: 'UTC'};
const operations = {
  calendar_create_local: () => ({type: 'calendar_create_local', fields}),
  calendar_read_selected: () => ({type: 'calendar_read_selected', target: {sourceId, sourceRevision, eventId, revision: revisions[0]}}),
  calendar_update: () => ({type: 'calendar_update', target: {sourceId, sourceRevision, eventId, revision: revisions[0]}, fields}),
  calendar_delete: () => ({type: 'calendar_delete', target: {sourceId, sourceRevision, eventId, revision: revisions[0]}}),
};
/** The record a native `applied` status carries for each kind (validateCalendarResult checks it). */
const applied = (operation, eventRevision) => ({version: 1, kind: operation.type, sourceId, eventId,
  revision: operation.type === 'calendar_update' ? revisions[1] : eventRevision,
  ...(operation.type === 'calendar_read_selected' ? {fields} : {})});

async function fixture() {
  const screen = {view: 'home', sensitive: false, selected: false, permission: 'granted', hidden: false};
  let op = 'calendar_create_local', authority = 'none', native = 'none', outcome = 'none', reviewed = null;
  let eventRevision = revisions[0], nativeCall = null, pending = null, refreshes = 0;
  const counts = {events: 0, edits: 0, shared: 0, queues: 0, deleted: 0, undone: 0};
  let queued = false;
  const contextNow = () => ({view: screen.view, sensitive: screen.sensitive, revision: 1, timeZone: 'UTC',
    ...(screen.view === 'calendar' && screen.selected ? {selectedObject: {kind: 'calendar-event', id: eventId,
      revision: eventRevision, accountId: sourceId, sourceRevision}} : {})});
  const calendar = {
    async requestAccess() {return {status: screen.permission};},
    async requestWorkflowReadAccess() {assert.fail('No next-event read in this campaign');},
    executeAgent(input) {
      assert.equal(nativeCall, null, 'One native review at a time');
      assert.equal(input.operation.type, op);
      nativeCall = deferred();
      native = 'reviewing';
      return nativeCall.promise;
    },
    async cancelAgent() {assert.fail('No abort in this campaign');},
  };
  const shell = {live: true};
  const document = {};
  Object.defineProperty(document, 'hidden', {get: () => screen.hidden});
  const mounted = await mountDeviceExecutor(shell, {
    alphaClient: {getState: () => ({context: contextNow()})},
    context() {},
    document,
    Capacitor: {isNativePlatform: () => false, getPlatform: () => 'web'},
    registerPlugin(name) {assert.equal(name, 'AlphaCalendar'); return calendar;},
    refreshDeletionViews() {refreshes++;},
  });
  const gate = () => proposalAllowed(operations[op](), contextNow(), {mapsSelectionCurrent: () => false});
  const finish = async () => {
    const result = await pending;
    pending = null;
    outcome = result.status;
    if (result.threw) assert.equal(result.threw, 'not-started', 'A refusal before the native call is not started');
    if (result.status === 'succeeded') {
      const kind = result.calendarResult.kind;
      if (kind === 'calendar_create_local') counts.events++;
      if (kind === 'calendar_update') counts.edits++;
      if (kind === 'calendar_read_selected') counts.shared++;
    }
    if (op === 'calendar_delete' && native === 'queued') {
      assert.equal(result.summary, 'Deletion queued with 10 seconds to Undo.');
      assert.equal(refreshes, 1, 'A queued deletion refreshes the deletion views');
    }
  };
  return {
    observe: () => ({'s.op': op, 's.authority': authority, 's.view': screen.view, 's.sensitive': screen.sensitive,
      's.hidden': screen.hidden, 's.permission': screen.permission, 's.selected': screen.selected,
      's.native': native, 's.outcome': outcome, 's.queued': queued, ...Object.fromEntries(
        Object.entries(counts).map(([key, value]) => ['s.' + key, value]))}),
    scene(view, sensitive, selected, permission) {Object.assign(screen, {view, sensitive, selected, permission, hidden: false}); eventRevision = revisions[0];},
    propose(next) {op = next; native = 'none'; outcome = 'none';},
    eventChanges() {eventRevision = revisions[1];},
    hide() {screen.hidden = true;},
    gate,
    async approve(start = true) {
      assert.equal(await gate(), true, 'The coordinator admits the card on this screen');
      authority = 'review'; reviewed = contextNow();
      if (start) await this.start();
    },
    /** The coordinator hands the approved operation and its reviewed context to the executor. */
    async start() {
      pending = settled(mounted.run(operations[op](), crypto.randomUUID(), reviewed));
      await tick(); await tick();
      if (!nativeCall) await finish();
    },
    /** The native review ends with this status; `conflict` is the native refusal of a changed record. */
    async nativeEnds(status) {
      const call = nativeCall;
      assert.ok(call, 'The native review is open');
      nativeCall = null;
      const operation = operations[op]();
      if (status === 'applied') {native = 'applied'; call.resolve({status, result: applied(operation, eventRevision)});}
      else if (status === 'queued') {native = 'queued'; queued = true; counts.queues++; call.resolve({status, deletion: {}});}
      else {native = status === 'conflict' ? 'refused' : status; call.resolve({status});}
      await finish();
    },
    undo() {assert.ok(queued); queued = false; counts.undone++;},
    windowEnds() {assert.ok(queued); queued = false; counts.deleted++;},
    settle() {authority = 'none'; outcome = 'none'; native = 'none';},
  };
}

const scenarios = {
  'create on the phone needs the card and the native review': async (f, step) => {
    await f.approve(); step('card approved, native review open', [call('approve'), call('nativeReview')]);
    await f.nativeEnds('applied'); step('native review saves', call('nativeApply'));
    f.settle(); step('settled', call('settle'));
  },
  'the owner cancels the native review': async (f, step) => {
    await f.approve(); step('card approved, native review open', [call('approve'), call('nativeReview')]);
    await f.nativeEnds('cancelled'); step('owner cancels', call('nativeCancel'));
  },
  'an update needs the selected event': async (f, step) => {
    f.propose('calendar_update'); step('update proposed', call('propose', 'calendar_update'));
    assert.equal(await f.gate(), false); step('no approval away from the event', {...call('approve'), reject: true});
    f.scene('calendar', false, true, 'granted'); step('event selected', call('scene', 'calendar', false, true, 'granted'));
    await f.approve(); step('card approved, native review open', [call('approve'), call('nativeReview')]);
    await f.nativeEnds('applied'); step('native review saves', call('nativeApply'));
  },
  'the event changes during the native review': async (f, step) => {
    f.scene('calendar', false, true, 'granted'); step('event selected', call('scene', 'calendar', false, true, 'granted'));
    f.propose('calendar_update'); step('update proposed', call('propose', 'calendar_update'));
    await f.approve(); step('card approved, native review open', [call('approve'), call('nativeReview')]);
    f.eventChanges(); step('event changes', call('eventChanges'));
    await f.nativeEnds('conflict'); step('native refuses the changed event', call('nativeTargetChanged'));
  },
  'a reviewed read of the selected event': async (f, step) => {
    f.scene('calendar', false, true, 'granted'); step('event selected', call('scene', 'calendar', false, true, 'granted'));
    f.propose('calendar_read_selected'); step('read proposed', call('propose', 'calendar_read_selected'));
    await f.approve(); step('card approved, native review open', [call('approve'), call('nativeReview')]);
    await f.nativeEnds('applied'); step('native review shares', call('nativeApply'));
  },
  'a delete is queued and stays unknown until its window ends': async (f, step) => {
    f.scene('calendar', false, true, 'granted'); step('event selected', call('scene', 'calendar', false, true, 'granted'));
    f.propose('calendar_delete'); step('delete proposed', call('propose', 'calendar_delete'));
    await f.approve(); step('card approved, native review open', [call('approve'), call('nativeReview')]);
    await f.nativeEnds('queued'); step('deletion queued', call('nativeQueueDelete'));
    f.windowEnds(); step('undo window ends', call('windowEnds'));
  },
  'an undone delete deletes nothing': async (f, step) => {
    f.scene('calendar', false, true, 'granted'); step('event selected', call('scene', 'calendar', false, true, 'granted'));
    f.propose('calendar_delete'); step('delete proposed', call('propose', 'calendar_delete'));
    await f.approve(); step('card approved, native review open', [call('approve'), call('nativeReview')]);
    await f.nativeEnds('queued'); step('deletion queued', call('nativeQueueDelete'));
    f.undo(); step('owner undoes', call('undo'));
  },
  'an unconfirmed native outcome is unknown': async (f, step) => {
    await f.approve(); step('card approved, native review open', [call('approve'), call('nativeReview')]);
    await f.nativeEnds('unknown'); step('native outcome unknown', call('nativeUnknown'));
  },
  'denied Calendar access refuses before the native calendar': async (f, step) => {
    f.scene('home', false, false, 'denied'); step('access off', call('scene', 'home', false, false, 'denied'));
    await f.approve(); step('refused as not started', [call('approve'), call('permissionRefused')]);
  },
  'a phone hidden after approval refuses create before asking for access': async (f, step) => {
    await f.approve(false); step('card approved', call('approve'));
    f.hide(); step('phone hidden', call('hide'));
    await f.start(); step('refused as not started', call('permissionRefused'));
  },
};

test('the installed executor runs phone Calendar operations only through the reviewed native path', {timeout: scaledTimeout(120_000)}, async () => {
  captureSources([driver]);
  // NoCalendarOperationIsDirect: the coordinator's direct-request list names no Calendar type.
  const coordinatorText = read(coordinator);
  const direct = coordinatorText.slice(coordinatorText.indexOf('const directTypes'), coordinatorText.indexOf('];', coordinatorText.indexOf('const directTypes')));
  assert.match(direct, /"create_note"/);
  assert.doesNotMatch(direct, /calendar/i);
  const sources = await deviceExecutorSources();
  const traces = [];
  for (const [name, run] of Object.entries(scenarios)) {
    const f = await fixture();
    const t = trace(name, f.observe());
    await run(f, (label, action) => checkpoint(t, label, action, f.observe()));
    traces.push(t);
  }
  const receipt = await checkTraces(boundInputs({model: 'CalendarAgentWrites', sources: [driver, coordinator, ...sources], traces,
    scope: 'bounded-component', assumptions: [
      'The executor callback is sliced from agent-adapter.ts and run unchanged with the real Calendar contract and presenters; approval is the coordinator gate proposalContextNotice (assertCalendarContext) and the direct-request list is read from the coordinator source.',
      'AlphaCalendar is a port: requestAccess answers with the scene permission and executeAgent holds the native review open until the trace ends it with applied, cancelled, conflict, queued or unknown. The Java review, its target check and the Undo window are not driven; undo and window end are port steps.',
      'Event, edit and share counts come from the executor receipts. Proposal parsing, journal, claim and receipt upload are DeviceActionReview; the deletion journal is DeletionJournal.',
    ]}));
  assert.equal(receipt.passed, true);
  assert.equal(receipt.traces, Object.keys(scenarios).length);
});
