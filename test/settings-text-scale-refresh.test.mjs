import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from './support/strip-types.mjs';

const source = readFileSync('apps/app/src/prototype/settings-adapter.ts', 'utf8');
const start = source.indexOf('export function mergeDeviceFacts('), end = source.indexOf('export function installSettingsAdapter(', start);
assert.ok(start >= 0 && end > start);
const context = vm.createContext({});
vm.runInContext(`${stripTypeScriptTypes(source.slice(start, end)).replace('export function', 'function')}\nglobalThis.merge = mergeDeviceFacts;`, context);
const merge = (...args) => JSON.parse(JSON.stringify(context.merge(...args)));

test('a device read that overlapped a text-size change keeps the shown text size and takes every other fact', () => {
  const read = {textScalePercent: 100, effectiveTextZoom: 100, battery: 40, wifi: true};
  const shown = {textScalePercent: 130, effectiveTextZoom: 130, battery: 80};
  assert.deepEqual(merge(read, shown, true), {textScalePercent: 130, effectiveTextZoom: 130, battery: 40, wifi: true});
  assert.deepEqual(merge({}, shown, true), {textScalePercent: 130, effectiveTextZoom: 130});
  assert.deepEqual(merge(read, {}, true), read);
});

test('a read with no overlapping text-size change is used as read', () => {
  const read = {textScalePercent: 100, battery: 40};
  assert.equal(context.merge(read, {textScalePercent: 130}, false), read);
});

test('moving the text-size slider does not retire an in-flight settings read', () => {
  const set = source.slice(source.indexOf("label: 'Text size'"), source.indexOf("api.toast('Text size could not be saved.')"));
  assert.ok(set.includes('++scaleGeneration') && set.includes('device.setTextScale'));
  assert.doesNotMatch(set.replaceAll('++scaleGeneration', ''), /generation/);
  const refresh = source.slice(source.indexOf('  async function refresh() {'), source.indexOf('  p.componentDidMount = function', source.indexOf('  async function refresh() {')));
  assert.match(refresh, /token = \+\+generation, scaleToken = scaleGeneration;/);
  assert.match(refresh, /facts = mergeDeviceFacts\([^;]+, facts, scaleGeneration !== scaleToken\);/);
});
