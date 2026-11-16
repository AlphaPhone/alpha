import {scaledTimeout} from '../specs/quint/refinement/timeouts.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {checkFilesFilter, checkHiddenFilesFilterReload, checkRetiredFilesFilterReload} from '../specs/quint/refinement/application/files-filter.mjs';

const source = fileURLToPath(import.meta.url);
test('actual Files filters discard late replies from replaced, cleared, left or cancelled requests', {timeout: scaledTimeout(120000)}, async () => {
  const receipt = await checkFilesFilter([source]);
  assert.equal(receipt.passed, true);
  assert.equal(receipt.driverInputsBound, true);
  assert.equal(receipt.inputsUnchanged, true);
  assert.equal(receipt.traces, 21);
});

test('a reload retired by view leave cannot publish filter rows', async () => {
  await checkRetiredFilesFilterReload([source]);
});

test('a reload retired while its filter stays shown cannot publish rows', async () => {
  await checkHiddenFilesFilterReload([source]);
});
