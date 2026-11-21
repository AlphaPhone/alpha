// Alpha's functional feature manifest (its own mobile-shell emitter over its product registration)
// and the exact inventory of Alpha-owned behavioural modules and reviewed functional surface in
// test/support/module-inventory.mjs.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureManifest} from '../scripts/feature-manifest.ts';
import {moduleInventory as inventory} from './support/module-inventory.mjs';

const manifest = await featureManifest();
const regenerate = 'Run bun scripts/feature-manifest.ts (add --modules for the module list) to see the current values.';

test('Alpha offers exactly the reviewed views, capabilities and actions', () => {
  const {functional} = manifest.alpha;
  assert.deepEqual(functional.views.map(view => view.id), inventory.functional.views,
    `Alpha's views changed. Update the reviewed functional surface in test/support/module-inventory.mjs. ${regenerate}`);
  const reviewed = Object.keys(inventory.functional.capabilities);
  const unreviewed = functional.capabilities.filter(name => !reviewed.includes(name));
  assert.deepEqual(unreviewed, [], `New capability. List it with its owning module in test/support/module-inventory.mjs. ${regenerate}`);
  const withdrawn = reviewed.filter(name => !functional.capabilities.includes(name));
  assert.deepEqual(withdrawn, [], `These capabilities are gone: remove them from test/support/module-inventory.mjs. ${regenerate}`);
  for (const [name, owner] of Object.entries(inventory.functional.capabilities)) {
    assert.ok(typeof owner === 'string' && owner.trim(), `${name} names the Alpha module that owns it`);
    for (const file of owner.match(/\b(?:apps|android)\/\S+\.(?:tsx?|java)\b/g) ?? [])
      assert.ok(fs.existsSync(file), `${name} owner ${file} exists`);
  }
  assert.deepEqual(functional.actions, inventory.functional.actions);
  assert.ok(!inventory.functional.views.includes('clock'), 'alarms and timers hand off to the Android clock without a Clock view');
});

test('every Alpha-owned behavioural module is listed; removed modules leave the inventory', () => {
  const listed = new Set(inventory.modules);
  const added = manifest.modules.filter(file => !listed.has(file));
  assert.deepEqual(added, [], `Unlisted Alpha-owned behaviour. Add it to test/support/module-inventory.mjs. ${regenerate}`);
  const gone = inventory.modules.filter(file => !manifest.modules.includes(file));
  assert.deepEqual(gone, [], `These modules are gone: remove them from test/support/module-inventory.mjs. ${regenerate}`);
  assert.deepEqual(inventory.modules, [...inventory.modules].sort(), 'modules stay sorted');
});


test('reviewed product helpers retain an inventoried owner and focused validation', () => {
  for (const [module, review] of Object.entries(inventory.reviewedHelpers)) {
    assert.ok(inventory.modules.includes(module), `${module} remains in the exact inventory`);
    assert.ok(inventory.modules.includes(review.owner), `${module} names its existing owning module`);
    assert.ok(review.reason.trim(), `${module} explains the extracted behavior`);
    assert.ok(review.tests.length > 0 && review.tests.every(file => fs.existsSync(file)), `${module} names retained focused validation`);
  }
});

test('branding stays out of the functional manifest and Alpha provides the launcher', () => {
  assert.equal(manifest.alpha.branding.appId, 'ai.alphacompute.alphaphone');
  assert.equal(manifest.alpha.branding.storage.launcherFavorites, 'alpha.launcher.favorites.v1');
  for (const capability of ['launcher.installed-apps', 'launcher.default-dial', 'launcher.favorites'])
    assert.ok(manifest.alpha.functional.capabilities.includes(capability), `Alpha provides ${capability}`);
  // Identity-only fields of the record never surface in the functional part.
  assert.doesNotMatch(JSON.stringify(manifest.alpha.functional), /alpha|Alpha/);
});

test('the Alpha manifest is deterministic and lists served views', async () => {
  const again = await featureManifest();
  assert.equal(JSON.stringify(again.alpha), JSON.stringify(manifest.alpha));
  const calendar = manifest.alpha.functional.views.find(view => view.id === 'calendar');
  assert.deepEqual(calendar?.serves, ['reminders']);
});
