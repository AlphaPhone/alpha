import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from './support/strip-types.mjs';

// The extracted saver remains independently checked; production retains the stronger
// epoch/drain/React-commit writer while sharing its bounded retry and idle-poll semantics.
const load = async path => import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(readFileSync(path, 'utf8'))).toString('base64'));
const {approvedOpenTab, createSessionSaver, saveRetryDelay, surfacePollIdle} = await load('apps/app/src/browser/browser-poll.ts');
const settle = async () => { for (let i = 0; i < 5; i++) await new Promise(resolveTick => setImmediate(resolveTick)); };

function saverHarness() {
  const h = {inputs: [1], enabled: true, time: 0, built: 0, writes: [], fail: false, value: {tabs: ['a']}};
  h.saver = createSessionSaver({
    inputs: () => h.inputs, enabled: () => h.enabled, now: () => h.time,
    snapshot: () => { h.built++; return h.value; },
    write: async snapshot => { h.writes.push(snapshot); if (h.fail) throw new Error('store'); },
  });
  return h;
}

test('an idle poll builds no snapshot', async () => {
  const h = saverHarness();
  h.saver.prime();
  const built = h.built;
  for (let tick = 0; tick < 50; tick++) h.saver.save();
  await settle();
  assert.equal(h.built, built);
  assert.equal(h.writes.length, 0);
  h.inputs = [2]; h.value = {tabs: ['a', 'b']};
  for (let tick = 0; tick < 50; tick++) h.saver.save();
  await settle();
  assert.equal(h.built, built + 1, 'one snapshot for one change');
  assert.deepEqual(h.writes, [{tabs: ['a', 'b']}]);
  h.inputs = [3];
  h.saver.save(); await settle();
  assert.equal(h.writes.length, 1, 'an unchanged snapshot is not written again');
});

test('nothing is built or written while saving is disabled, and the change is kept', async () => {
  const h = saverHarness();
  h.enabled = false;
  for (let tick = 0; tick < 20; tick++) h.saver.save();
  assert.equal(h.built, 0);
  h.enabled = true; h.saver.save(); await settle();
  assert.equal(h.writes.length, 1);
});

test('a rejected save backs off instead of repeating on every poll', async () => {
  const h = saverHarness();
  h.fail = true;
  h.saver.save(); await settle();
  assert.equal(h.writes.length, 1);
  for (let tick = 0; tick < 19; tick++) { h.time += 100; h.saver.save(); await settle(); }
  assert.equal(h.writes.length, 1, 'no retry inside the first 2 s');
  const built = h.built;
  h.saver.save();
  assert.equal(h.built, built, 'a waiting retry builds nothing');
  h.time = 2000; h.saver.save(); await settle();
  assert.equal(h.writes.length, 2);
  h.time = 5999; h.saver.save(); await settle();
  assert.equal(h.writes.length, 2, 'the second wait is 4 s');
  h.time = 6000; h.saver.save(); await settle();
  assert.equal(h.writes.length, 3);
  // A changed snapshot is written at once; success ends the backoff.
  h.inputs = [2]; h.value = {tabs: ['c']}; h.fail = false; h.time = 6100;
  h.saver.save(); await settle();
  assert.equal(h.writes.length, 4);
  h.time = 1e9; h.saver.save(); await settle();
  assert.equal(h.writes.length, 4, 'a stored snapshot is not retried');
});

test('retry delay doubles from 2 s to at most 60 s', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 500].map(saveRetryDelay), [2000, 4000, 8000, 16000, 32000, 60000, 60000, 60000]);
  for (const odd of [0, -3, NaN, undefined]) assert.equal(saveRetryDelay(odd), 2000);
});

test('the poll is idle only off the Browser view with the page already hidden', () => {
  assert.equal(surfacePollIdle('home', 'hidden', 'hidden'), true);
  assert.equal(surfacePollIdle(undefined, 'hidden', 'hidden'), true);
  assert.equal(surfacePollIdle('browser', 'hidden', 'hidden'), false);
  assert.equal(surfacePollIdle('home', '', 'hidden'), false, 'geometry must be resent first');
  assert.equal(surfacePollIdle('home', '{"id":"b1"}', 'hidden'), false);
});

test('approved opens reuse an untouched New tab or the agent tab and never a user page', () => {
  const tabs = [{id: 'user'}, {id: 'agent'}, {id: 'blank'}, {id: 'private-blank', priv: true}];
  const untouched = id => id === 'blank' || id === 'private-blank';
  // The selected untouched New tab comes first, then the agent's own tab, then any untouched New tab.
  assert.equal(approvedOpenTab(tabs, 'blank', 'agent', false, untouched), 'blank');
  assert.equal(approvedOpenTab(tabs, 'user', 'agent', false, untouched), 'agent');
  assert.equal(approvedOpenTab(tabs, 'user', undefined, false, untouched), 'blank');
  // A closed agent tab or a page the user opened is never a target; with no candidate a new tab opens.
  assert.equal(approvedOpenTab([{id: 'user'}], 'user', 'agent', false, () => false), undefined);
  assert.equal(approvedOpenTab([{id: 'user'}, {id: 'other'}], 'user', undefined, false, () => false), undefined);
  // Profiles never mix: a private open reuses only a private tab, a normal open only a normal one.
  assert.equal(approvedOpenTab(tabs, 'user', 'agent', true, untouched), 'private-blank');
  assert.equal(approvedOpenTab([{id: 'user'}, {id: 'private-blank', priv: true}], 'private-blank', undefined, false, untouched), undefined);
  assert.equal(approvedOpenTab([{id: 'user'}, {id: 'agent', priv: true}], 'user', 'agent', false, () => false), undefined);
  // An open the owner asked for in a new tab never replaces the agent's earlier page; an untouched
  // New tab is a new tab already.
  assert.equal(approvedOpenTab(tabs, 'user', 'agent', false, untouched, true), 'blank');
  assert.equal(approvedOpenTab(tabs, 'blank', 'agent', false, untouched, true), 'blank');
  assert.equal(approvedOpenTab([{id: 'user'}, {id: 'agent'}], 'user', 'agent', false, () => false, true), undefined);
});
