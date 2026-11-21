// A current-format Clock handoff envelope saved while the retired plain key existed carries that
// key's bytes in `legacy`. Alpha no longer reads the plain key, so it must still read such an
// envelope, rewrite it with `legacy:null` on the next save, and not refuse a Clock dispatch.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClockHandoffHistory, clockHandoffSlot} from '../apps/app/src/runtime/clock-handoff-history.ts';
import {loadWorkflowClockFixture} from './fixtures/workflow-clock-admission.mjs';

const record = {id: 'x', action: 'set', status: 'opened', at: '2026-01-01T07:00:00.000Z'};
const upgraded = () => ({version: 1, legacy: JSON.stringify(record), record});

test('an envelope that remembers the retired plain key reads, and the next save drops that copy', async () => {
  const slots = new Map([[clockHandoffSlot, upgraded()]]);
  const storage = {
    read: async slot => structuredClone(slots.get(slot) ?? null),
    async compareExchange(slot, expected, value) {
      if (JSON.stringify(slots.get(slot) ?? null) !== JSON.stringify(expected)) return {status: 'conflict'};
      slots.set(slot, structuredClone(value));
      return {status: 'saved'};
    },
  };
  const history = createClockHandoffHistory(storage);
  const snapshot = await history.read();
  assert.deepEqual(snapshot.record, record);
  assert.equal(snapshot.legacy, null);
  const next = {id: 'y', action: 'show', status: 'opening', at: '2026-01-02T07:00:00.000Z'};
  const saved = await history.save(snapshot, next);
  assert.deepEqual(saved.record, next);
  assert.deepEqual(slots.get(clockHandoffSlot), {version: 1, legacy: null, record: next});
  assert.deepEqual((await history.read()).record, next);
});

test('a Workflows Clock dispatch over that envelope is not refused', async () => {
  const f = (await loadWorkflowClockFixture())(false, false, upgraded());
  await f.settle();
  assert.equal(f.observe().record, 'opened');
  await f.open();
  f.assertMessage(/^(?!Couldn’t read history$)/);
  await f.review();
  await f.approve();
  assert.equal(f.observe().record, 'opened');
  await f.release();
  assert.equal(f.observe().handoffs, 1);
  await f.finish('opened');
  assert.equal(f.observe().record, 'opened');
  f.assertMessage(/^(?!Can’t reach Clock$|Couldn’t read history$)/);
  f.close();
  f.unmount();
});
