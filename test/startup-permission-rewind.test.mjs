import {test} from 'node:test';
import assert from 'node:assert/strict';
const {startupPermissionRewind, settleWithin, createStartupPermissionFlow, STARTUP_PERMISSION_ACTION_TIMEOUT} = await import('../apps/app/src/startup-permission-flow.ts');
const settle = () => new Promise(resolve => setImmediate(resolve));

test('only a permission read as not ready moves setup back; replaced reads are ignored', () => {
  assert.equal(startupPermissionRewind([null, 'ready', 'ready', 'ready'], 2, false), -1);
  assert.equal(startupPermissionRewind([null, null, null, null], 2, true), -1);
  assert.equal(startupPermissionRewind(['ready', 'ready', 'ready', 'ready'], 4, true), -1);
  assert.equal(startupPermissionRewind([null, 'settings', 'ready', 'ready'], 2, false), 1);
  assert.equal(startupPermissionRewind(['unavailable', null, 'ready'], 2, false), 0);
  assert.equal(startupPermissionRewind(['ready', 'ready', 'request'], 2, false), -1, 'the current step is not a rewind');
  assert.equal(startupPermissionRewind(['ready', 'ready', 'ready', 'request'], 2, false), -1, 'a later step is reached in order');
  assert.equal(startupPermissionRewind(['ready', 'ready', 'ready', 'request'], 3, true), 3, 'Ready returns to any missing step');
});

test('a bounded wait reports settled or timeout, keeps an early failure and ignores a late one', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  assert.equal(await settleWithin(Promise.resolve('x'), 10), 'settled');
  await assert.rejects(settleWithin(Promise.reject(Error('early')), 10), /early/);
  let fail, outcome;
  void settleWithin(new Promise((_resolve, reject) => { fail = reject; }), 10).then(value => { outcome = value; });
  t.mock.timers.tick(9); await settle(); assert.equal(outcome, undefined);
  t.mock.timers.tick(1); await settle(); assert.equal(outcome, 'timeout');
  fail(Error('late')); await settle(); assert.equal(outcome, 'timeout');
});

test('a prompt that never settles ends at the limit with access read back, and a later check works', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  let granted = false, requests = 0, result;
  const flow = createStartupPermissionFlow({
    status: async () => ({granted, enabled: granted}),
    request: () => { requests++; return new Promise(() => {}); },
    openSettings: async () => {},
  }, {store: null, actionTimeout: STARTUP_PERMISSION_ACTION_TIMEOUT});
  assert.equal(await flow.refresh(), 'request');
  void flow.enable().then(value => { result = value; });
  await settle();
  assert.equal(requests, 1);
  assert.equal(await flow.refresh(), null, 'the open prompt still owns the read');
  t.mock.timers.tick(STARTUP_PERMISSION_ACTION_TIMEOUT - 1); await settle(); assert.equal(result, undefined);
  t.mock.timers.tick(1); await settle();
  assert.equal(result, 'settings', 'an attempted prompt is never asked again');
  granted = true;
  assert.equal(await flow.refresh(), 'ready');
  assert.equal(requests, 1);
});

test('without a limit the flow waits for the platform as before', async () => {
  let finish, result;
  const flow = createStartupPermissionFlow({status: async () => ({granted: false, enabled: false}), request: () => new Promise(resolve => { finish = resolve; }), openSettings: async () => {}}, {store: null});
  void flow.enable().then(value => { result = value; });
  await settle(); assert.equal(result, undefined);
  finish(); await settle(); assert.equal(result, 'settings');
});
