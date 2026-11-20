import assert from 'node:assert/strict';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {checkTraces} from '../specs/quint/refinement/check-traces.mjs';
import {boundInputs, call, captureSources, checkpoint, memoryStore, read, trace} from '../specs/quint/refinement/application/support.mjs';
import {deviceExecutorSources, mountDeviceExecutor, proposalAllowed, settled} from '../specs/quint/refinement/application/device-action-executor.mjs';
import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';

// NotesAgentSource refinement: the installed device executor's phone Notes branches over the real
// shared NotesStore (a memory storage port), the real Trash policy and the coordinator's real context
// gate. Durable Trash is a port that applies the executor's own edit to an in-memory document.
const driver = fileURLToPath(import.meta.url);
const coordinator = 'apps/app/src/ui/device-actions/client-coordinator.ts';
const noteId = 'note-1';
const edited = {title: 'Edited title', body: 'Edited body'};

async function fixture() {
  let helpers;
  const storage = memoryStore();
  const screen = {view: 'notes', sensitive: false, selected: false};
  let op = 'create_note', authority = 'none', outcome = 'none', workflow = false, operationId = '';
  let selection = null, proposal = null, reviewed = null, trash = {version: 1, entries: []}, trashFull = false;
  let notes = 0, edits = 0, shared = 0, trashFailsAfterWrite = false;
  const steps = [];
  const shell = {live: true, notesSourceMode: 'canonical', notesStorageFailed: false, notesPending: 0,
    notesStore: null, notesRaw: '', previousNotesAvailability: 'present',
    vget(key) {assert.equal(key, 'notes'); return {list: this.notesStore ? this.notesStore.list : []};},
    async vset(key, patch) {
      // The legacy Notes view persists its list to the same store before reporting it saved.
      assert.equal(key, 'notes');
      this.notesStore.replace(patch.list);
      this.notesRaw = this.notesStore.raw;
      return true;
    },
    api() {return {};},
  };
  const contextNow = () => ({view: screen.view, sensitive: screen.sensitive, revision: 1, timeZone: 'UTC',
    ...(screen.view === 'notes' && screen.selected && selection ? {selectedObject: selection} : {})});
  const refreshSelection = async () => {
    const list = shell.notesStore?.list ?? [];
    if (!list.some(note => note.id === noteId)) {selection = null; return;}
    const target = await shell.notesStore.target(noteId);
    selection = {kind: 'note', id: target.noteId, revision: target.revision, accountId: target.sourceId, sourceRevision: target.sourceRevision};
  };
  const window = new EventTarget();
  const mounted = await mountDeviceExecutor(shell, {
    alphaClient: {getState: () => ({context: contextNow()})},
    context() {},
    document: {hidden: false},
    window,
    connectionController: {getSnapshot: () => ({session: {sessionId: 'session'}}), getWorkflowDeviceTarget: () => ({installationId: 'device'})},
    readPreviousNotesAvailability: async () => 'present',
    withNotesDeletionLock: async run => run(),
    async editNotesTrash(update) {
      // The restorable copy is written while the note is still in the store (write-ahead).
      assert.ok(shell.notesStore.list.some(note => note.id === noteId), 'Trash is written before the tombstone');
      trash = update(structuredClone(trash));
      steps.push('trash');
      if (trashFailsAfterWrite) storage.failWrites = true;
      return trash;
    },
    armNotesAgentFallback() {},
    originalSet() {},
    failedNotesStatus() {return '';},
  });
  helpers = mounted.helpers;
  const target = () => ({sourceId: selection.accountId, sourceRevision: selection.sourceRevision, noteId: selection.id, revision: selection.revision});
  const operation = () => op === 'create_note' ? {type: 'create_note', title: 'Agent note', body: 'Agent body'}
    : op === 'notes_update' ? {type: op, target: target(), fields: edited} : {type: op, target: target()};
  const tombstone = () => !!shell.notesStore && JSON.parse(shell.notesStore.raw).deleted.some(entry => entry.operationId === operationId);
  return {
    observe: () => ({'s.source': shell.notesSourceMode, 's.storageFailed': shell.notesStorageFailed, 's.op': op,
      's.authority': authority, 's.view': screen.view, 's.sensitive': screen.sensitive, 's.workflow': workflow,
      's.selected': screen.selected, 's.trashCopy': trash.entries.some(entry => entry.id === operationId),
      's.tombstone': tombstone(), 's.trashFull': trashFull, 's.notes': notes, 's.edits': edits, 's.shared': shared,
      's.outcome': outcome}),
    steps,
    async scene(source, view, sensitive, selected) {
      if (source === 'legacy' && !shell.notesStore) {
        shell.notesStore = new helpers.NotesStore(storage, [{id: noteId, kind: 'text', title: 'Saved', body: 'Saved body'}]);
        shell.notesRaw = shell.notesStore.raw;
      }
      shell.notesSourceMode = source;
      Object.assign(screen, {view, sensitive, selected});
      await refreshSelection();
    },
    propose(next, asWorkflow = false) {op = next; workflow = asWorkflow; outcome = 'none'; operationId = crypto.randomUUID(); proposal = operation();},
    storageFails() {shell.notesStorageFailed = true;},
    fillTrash() {
      // One older restorable copy at the byte limit: the real policy refuses any new entry.
      trash = {version: 1, entries: [{id: crypto.randomUUID(), note: {id: 'older', kind: 'text', title: 'Older',
        body: 'x'.repeat(30 * 1024 * 1024)}, index: 0, deletedAt: 1}]};
      trashFull = true;
    },
    async noteChanges() {
      // The owner edits the selected note in Notes after the card was built.
      shell.notesStore.replace(shell.notesStore.list.map(note => note.id === noteId ? {...note, body: 'Owner edit'} : note));
      shell.notesRaw = shell.notesStore.raw;
      await refreshSelection();
    },
    failTombstone() {trashFailsAfterWrite = true;},
    gate: () => proposalAllowed(proposal, contextNow(), {mapsSelectionCurrent: () => false}),
    async begin(as) {
      if (as === 'review') assert.equal(await this.gate(), true, 'The coordinator admits the card on this screen');
      authority = as; reviewed = contextNow();
    },
    async run() {
      const result = await settled(mounted.run(proposal, operationId, reviewed));
      assert.notEqual(result.threw, 'other', 'A refusal is failed or not started, never unknown');
      outcome = result.status;
      if (result.status === 'succeeded') {
        if (op === 'create_note') {notes++; assert.ok(shell.notesStore.list.some(note => note.id === operationId));}
        if (op === 'notes_update') {edits++; assert.deepEqual(
          (({title, body}) => ({title, body}))(shell.notesStore.list.find(note => note.id === noteId)), edited);}
        if (op === 'notes_read_selected') {shared++; assert.equal(result.notesResult.fields.body, 'Saved body');}
      }
      if (op === 'notes_delete' && trashFull) assert.equal(result.summary, 'Nothing was deleted because Trash is full.');
      return result;
    },
    settle() {authority = 'none'; outcome = 'none';},
  };
}

const scenarios = {
  'the default source refuses a direct note': async (f, step) => {
    await f.scene('canonical', 'notes', false, false);
    f.propose('create_note');
    await f.begin('request'); step('runs without a card', call('runDirect'));
    const result = await f.run(); step('refused on the agent’s Notes', call('refuse'));
    assert.match(result.summary, /^Nothing was saved because Notes is not set to On this phone\.$/);
  },
  'Previous notes takes a direct note': async (f, step) => {
    await f.scene('legacy', 'home', false, false); step('Previous notes on Home', call('scene', 'legacy', 'home', false, false));
    f.propose('create_note');
    await f.begin('request'); step('runs without a card', call('runDirect'));
    await f.run(); step('note created', call('create'));
  },
  'a reviewed read then an update of the selected note': async (f, step) => {
    await f.scene('legacy', 'notes', false, true); step('note selected', call('scene', 'legacy', 'notes', false, true));
    f.propose('notes_read_selected'); step('read proposed', call('propose', 'notes_read_selected', false));
    await f.begin('review'); step('approved', call('approve'));
    await f.run(); step('snapshot shared', call('share'));
    f.settle(); step('settled', call('settle'));
    await f.scene('legacy', 'notes', false, true);
    f.propose('notes_update'); step('update proposed', call('propose', 'notes_update', false));
    await f.begin('review'); step('approved', call('approve'));
    await f.run(); step('note updated', call('update'));
  },
  'the selected note changes after approval': async (f, step) => {
    await f.scene('legacy', 'notes', false, true); step('note selected', call('scene', 'legacy', 'notes', false, true));
    f.propose('notes_delete'); step('delete proposed', call('propose', 'notes_delete', false));
    await f.begin('review'); step('approved', call('approve'));
    await f.noteChanges(); step('owner edits the note', call('noteChanges'));
    // The published selection now names the new revision, so the executor refuses before the store.
    const result = await f.run(); step('refused, nothing written', call('refuse'));
    assert.equal(result.threw, 'not-started');
  },
  'an approved delete writes Trash before the tombstone': async (f, step) => {
    await f.scene('legacy', 'notes', false, true); step('note selected', call('scene', 'legacy', 'notes', false, true));
    f.propose('notes_delete'); step('delete proposed', call('propose', 'notes_delete', false));
    await f.begin('review'); step('approved', call('approve'));
    await f.run(); step('trash copy then tombstone', [call('writeTrashCopy'), call('writeTombstone', true)]);
    assert.deepEqual(f.steps, ['trash']);
  },
  'a full Trash deletes nothing': async (f, step) => {
    await f.scene('legacy', 'notes', false, true); step('note selected', call('scene', 'legacy', 'notes', false, true));
    f.fillTrash(); step('Trash full', call('fillTrash'));
    f.propose('notes_delete'); step('delete proposed', call('propose', 'notes_delete', false));
    await f.begin('review'); step('approved', call('approve'));
    await f.run(); step('refused before the copy', call('refuse'));
  },
  'an unconfirmed tombstone is unknown': async (f, step) => {
    await f.scene('legacy', 'notes', false, true); step('note selected', call('scene', 'legacy', 'notes', false, true));
    f.propose('notes_delete'); step('delete proposed', call('propose', 'notes_delete', false));
    f.failTombstone();
    await f.begin('review'); step('approved', call('approve'));
    const result = await f.run(); step('trash copy, tombstone unconfirmed', [call('writeTrashCopy'), call('writeTombstone', false)]);
    assert.equal(result.summary, 'The Notes outcome is uncertain.');
  },
  'failed Previous notes storage refuses': async (f, step) => {
    await f.scene('legacy', 'home', false, false); step('Previous notes on Home', call('scene', 'legacy', 'home', false, false));
    f.storageFails(); step('storage fails', call('storageFails'));
    f.propose('create_note');
    await f.begin('request'); step('runs without a card', call('runDirect'));
    await f.run(); step('refused', call('refuse'));
  },
  'a protected screen admits no selected-note card': async (f, step) => {
    await f.scene('legacy', 'notes', true, true); step('protected screen', call('scene', 'legacy', 'notes', true, true));
    f.propose('notes_read_selected'); step('read proposed', call('propose', 'notes_read_selected', false));
    assert.equal(await f.gate(), false); step('no approval', {...call('approve'), reject: true});
  },
};

test('the installed executor acts on Previous notes only, through the real store and Trash policy', {timeout: scaledTimeout(120_000)}, async () => {
  captureSources([driver]);
  // OnlyCreateRunsWithoutCard: of these operations only create_note is on the coordinator's direct-request list.
  const coordinatorText = read(coordinator), start = coordinatorText.indexOf('const directTypes');
  const direct = coordinatorText.slice(start, coordinatorText.indexOf('];', start));
  assert.match(direct, /"create_note"/);
  assert.doesNotMatch(direct, /notes_read_selected|notes_update|notes_delete|notes_query/);
  const sources = await deviceExecutorSources();
  const traces = [];
  for (const [name, run] of Object.entries(scenarios)) {
    const f = await fixture();
    const t = trace(name, f.observe());
    await run(f, (label, action) => checkpoint(t, label, action, f.observe()));
    traces.push(t);
  }
  const receipt = await checkTraces(boundInputs({model: 'NotesAgentSource', sources: [driver, coordinator, ...sources], traces,
    scope: 'bounded-component', assumptions: [
      'The executor callback and previousNotesRefusalNow are sliced from agent-adapter.ts and run unchanged over the real shared NotesStore, Notes contract and Trash policy; the coordinator gate proposalContextNotice (assertNotesContext) decides approval and the direct-request list is read from the coordinator source.',
      'Durable Trash, the deletion lock and the legacy view save are ports over the same memory storage; an unconfirmed tombstone is a storage write that does not read back.',
      'Not driven: notes_query (it opens its own review sheet), workflow-step create, the Review-first preference and the agent’s canonical Notes write (a server action; AGENT-09 stays an expected violation), and the server-side snapshot rule for updates.',
    ]}));
  assert.equal(receipt.passed, true);
  assert.equal(receipt.traces, Object.keys(scenarios).length);
});
