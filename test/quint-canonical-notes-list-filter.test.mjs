import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {checkTraces} from '../specs/quint/refinement/check-traces.mjs';
import {captureSources, boundInputs, call, sourceModule} from '../specs/quint/refinement/application/support.mjs';

// Partial source contract: the shared admission predicate for the agent's Notes list filter.
// The phone executor, coordinator queueing and React commit are model-only (see the manifest).
const driver = fileURLToPath(import.meta.url);
const views = ['notes', 'home', 'calendar'];

async function checkCanonicalNotesListFilter() {
  captureSources([driver]);
  const contract = await sourceModule('.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/notes-organize-contract.ts');
  const traces = [];
  for (const view of views) for (const sensitive of [false, true]) for (const obstructed of [false, true]) for (const revision of [0, 1, 2]) {
    // The phone names the canonical list only while the plain list is in front and owned
    // (canonicalNotesListObservation); otherwise the context carries no selection.
    const named = view === 'notes' && !sensitive && !obstructed;
    const context = {view, sensitive, selectedObject: named ? {kind: 'canonical-note-source', id: 'notes', revision: String(revision)} : null};
    const admitted = contract.notesOrganizeContextAllowed(context, {type: 'notes_list_filter'});
    const steps = [];
    for (let i = 0; i < revision; i++) steps.push({label: 'notes change', action: call('notesChange'), expect: {'s.revision': i + 1}});
    steps.push({label: 'screen', action: call('scene', view, sensitive, obstructed), expect: {'s.view': view, 's.sensitive': sensitive, 's.obstructed': obstructed}});
    steps.push({label: 'turn context', action: call('observe'), expect: {'s.named': !!context.selectedObject,
      ...(context.selectedObject ? {'s.namedRevision': Number(context.selectedObject.revision)} : {})}});
    steps.push({label: 'shared admission', action: call('propose', 1, true, false), expect: {'s.proposal': admitted ? 'admitted' : 'refused'}});
    traces.push({name: `${view}${sensitive ? '-locked' : ''}${obstructed ? '-open' : ''}-r${revision}`, init: call('init'),
      expect: {'s.proposal': 'none'}, steps});
  }
  // The same predicate refuses a context that names something else in the Notes view.
  assert.equal(contract.notesOrganizeContextAllowed({view: 'notes', sensitive: false, selectedObject: {kind: 'note', id: 'notes', revision: '0'}}, {type: 'notes_list_filter'}), false);
  assert.equal(contract.notesOrganizeContextAllowed({view: 'notes', sensitive: false, selectedObject: {kind: 'canonical-note-source', id: 'notes', revision: '01'}}, {type: 'notes_list_filter'}), false);
  const sources = ['.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/notes-organize-contract.ts',
    '.eliza/client-features/packages/contracts/src/device-reviews.ts', driver];
  captureSources(sources);
  return checkTraces(boundInputs({model: 'CanonicalNotesListFilter', sources, traces, scope: 'bounded-component', assumptions: [
    'The actual shared notesOrganizeContextAllowed (canonicalNotesListContextAllowed) decides every screen, lock, obstruction and revision combination; the model admits exactly the same contexts.',
    'The context the phone sends is constructed here from canonicalNotesListObservation\'s rule (plain list in front, unlocked, nothing open, owned). The executor, capability negotiation, coordinator queueing and React commit are model-only.']}));
}

test('partial source contract: the shared list-filter admission matches CanonicalNotesListFilter', {timeout: scaledTimeout(240000)}, async () => {
  const receipt = await checkCanonicalNotesListFilter();
  assert.equal(receipt.passed, true);
  assert.equal(receipt.inputsUnchanged, true);
  assert.equal(receipt.driverInputsBound, true);
  assert.equal(receipt.traces, 36);
});
