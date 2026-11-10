import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from './support/strip-types.mjs';

const source = readFileSync('apps/app/src/prototype/system-shade.ts', 'utf8');
const region = source.slice(source.indexOf('// system-shade:begin'), source.indexOf('// system-shade:end'));
const askStart = source.indexOf('  p.expandAndroidShade = async function () {'), askEnd = source.lastIndexOf('}');
assert.ok(askStart > 0 && askEnd > askStart);
// The decision region plus the Android request itself, with the plugin supplied by the test.
const module = `${region}\nexport function install(p, device) {\n${source.slice(askStart, askEnd)}\n}`;
const m = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(module)).toString('base64'));
const settle = () => new Promise(resolve => setImmediate(resolve));

test('Android’s answer is used when it arrives in time; a failure reads as unsupported', async () => {
  assert.equal(await m.shadeOutcomeWithin(Promise.resolve({status: 'opened'})), 'opened');
  assert.equal(await m.shadeOutcomeWithin(Promise.resolve({status: 'standalone'})), 'standalone');
  assert.equal(await m.shadeOutcomeWithin(Promise.resolve(undefined)), undefined);
  assert.equal(await m.shadeOutcomeWithin(Promise.reject(Error('refused'))), 'unsupported');
});

test('a request Android never answers ends as unsupported at the limit, and a late answer changes nothing', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  let answer, outcome;
  void m.shadeOutcomeWithin(new Promise(resolve => { answer = resolve; })).then(value => { outcome = value; });
  t.mock.timers.tick(m.SHADE_REQUEST_TIMEOUT - 1); await settle();
  assert.equal(outcome, undefined);
  t.mock.timers.tick(1); await settle();
  assert.equal(outcome, 'unsupported');
  answer({status: 'opened'}); await settle();
  assert.equal(outcome, 'unsupported');
});

test('a hung shade request shows the fallback once and the next pull asks Android again', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const toasts = [], pending = [];
  const shell = {toast: message => toasts.push(message)};
  m.install(shell, {openNotificationShade: () => new Promise(resolve => pending.push(resolve))});
  void shell.expandAndroidShade(); await settle();
  void shell.expandAndroidShade(); await settle();
  assert.equal(pending.length, 1, 'one request while Android has not answered');
  assert.equal(shell.alphaShadeAsking, true);
  t.mock.timers.tick(m.SHADE_REQUEST_TIMEOUT); await settle();
  assert.equal(shell.alphaShadeAsking, false);
  assert.deepEqual(toasts, [m.shadeFallback('unsupported')]);
  const second = shell.expandAndroidShade(); await settle();
  assert.equal(pending.length, 2);
  pending[1]({status: 'opened'}); await second;
  assert.equal(shell.alphaShadeAsking, false);
  assert.equal(toasts.length, 1, 'an opened shade shows no fallback');
});

test('a plugin that throws synchronously still releases the next pull', async () => {
  const toasts = [], shell = {toast: message => toasts.push(message)};
  m.install(shell, {openNotificationShade() { throw Error('no bridge'); }});
  await shell.expandAndroidShade();
  assert.equal(shell.alphaShadeAsking, false);
  assert.deepEqual(toasts, [m.shadeFallback('unsupported')]);
});
