import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from '../specs/quint/refinement/application/support.mjs';

const {workflowStepScreenCurrent} = await sourceModule('apps/app/src/runtime/workflow-device-contract.ts');
const approved = {view: 'workflows', sensitive: false, revision: 3, selectedObject: {kind: 'workflow-run', id: 'run', revision: 'v1'}};
const check = (change = {}) => workflowStepScreenCurrent({live: true, hidden: false, current: structuredClone(approved), approved, read: true, ...change});

test('a workflow phone step runs only on the screen it was approved on, in the foreground', () => {
  assert.equal(check(), true);
  assert.equal(check({live: false}), false, 'a retired shell');
  assert.equal(check({hidden: true}), false, 'a hidden page');
  assert.equal(check({current: {...approved, revision: 4}}), false, 'a changed screen');
  assert.equal(check({current: {...approved, selectedObject: {kind: 'workflow-run', id: 'other', revision: 'v1'}}}), false, 'another run');
  const sensitive = {...approved, sensitive: true};
  assert.equal(check({current: sensitive, approved: sensitive}), false, 'a sensitive screen');
  const notes = {...approved, view: 'notes'};
  assert.equal(check({current: notes, approved: notes, read: false}), false, 'another view');
});

test('a workflow read also needs the run receipt; a notification or speech step needs Workflows only', () => {
  const list = {view: 'workflows', sensitive: false, revision: 3};
  assert.equal(check({current: list, approved: list, read: true}), false);
  assert.equal(check({current: list, approved: list, read: false}), true);
});
