// Alpha's functional feature manifest (the mobile-shell emitter over its product registration)
// and the exact inventory of Alpha-owned behavioural modules in test/support/module-inventory.mjs.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {featureManifest} from '../scripts/feature-manifest.ts';
import {moduleInventory as inventory} from './support/module-inventory.mjs';

const manifest = await featureManifest();
const regenerate = 'Run node scripts/feature-manifest.ts --modules to see the current list.';

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

test('every device capability Alpha negotiates is declared in its registration', () => {
  // The manifest is only as honest as the declared list: a capability added to the negotiation
  // without being declared would never surface in the manifest.
  const source = fs.readFileSync('apps/app/src/runtime/phone-context.ts', 'utf8');
  const start = source.indexOf('export function selectDeviceCapabilities(');
  assert.ok(start >= 0, 'device capability selection found');
  const body = source.slice(start, source.indexOf('\n}\n', start));
  const constants = Object.fromEntries([...source.matchAll(/(?:export )?const ([A-Z_]+_CAPABILITY)\s*=\s*'([^']+)'/g)].map(match => [match[1], match[2]]));
  const literals = [...body.matchAll(/'([a-z]+\.[a-z0-9.-]+\.v\d+)'/g)].map(match => match[1]);
  const named = [...body.matchAll(/\b([A-Z_]+_CAPABILITY)\b/g)].map(match => constants[match[1]]).filter(Boolean);
  const declared = new Set(manifest.alpha.functional.capabilities);
  const undeclared = [...new Set([...literals, ...named])].filter(name => !declared.has(name));
  assert.ok(literals.length > 0, 'negotiated capability literals found');
  assert.deepEqual(undeclared, [], 'declare these in apps/app/src/product/alpha-product-registration.ts features.capabilities');
});

test('the Alpha manifest is deterministic and lists served views', async () => {
  const again = await featureManifest();
  assert.equal(JSON.stringify(again.alpha), JSON.stringify(manifest.alpha));
  const calendar = manifest.alpha.functional.views.find(view => view.id === 'calendar');
  assert.deepEqual(calendar?.serves, ['reminders']);
});
