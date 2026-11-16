import assert from 'node:assert/strict';
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// The Quint conformance drivers execute Alpha's own renderer UI (apps/app/src/ui). These checks
// replace the old "the prepared copy is the exact pinned upstream file" assertions: the prepared
// upstream projection must carry no elizaOS UI, and a bundle must read the local module.
const root = fileURLToPath(new URL('../..', import.meta.url));
/** This helper, bound as a driver input wherever its checks run. */
export const uiStagingHelper = 'test/support/quint-conformance-ui-staging.mjs';
export const preparedProjection = '.eliza/client-features';
export const preparedStamp = preparedProjection + '/.source.json';
// Upstream UI: packages/ui, the React directories of plugins and packages/app, and any component
// or stylesheet. The plugin-maps renderer is staged only as a type-only leaf (checked in
// test/client-feature-preparation.test.mjs), so no staged module imports maplibre-gl.
const upstreamUi = path => /^(?:packages\/ui\/|packages\/app\/src\/(?:renderer|shims)\/|plugins\/[^/]+\/src\/(?:components|ui|hooks|views|companion)\/)|\.(?:[jt]sx|css)$/.test(path);

/** Asserts the prepared projection is at the pinned commit and stages no upstream UI, neither in its receipt nor on disk. */
export function assertUpstreamUiNotStaged() {
  const stamp = JSON.parse(readFileSync(resolve(root, preparedStamp), 'utf8'));
  assert.equal(stamp.baseCommit, JSON.parse(readFileSync(resolve(root, 'upstream.lock.json'), 'utf8')).commit);
  for (const inventory of [stamp.files, stamp.sourceFiles]) {
    assert.deepEqual(Object.keys(inventory).filter(upstreamUi), [], 'the prepared projection stages no upstream UI');
  }
  const prepared = (...path) => resolve(root, preparedProjection, ...path);
  assert.equal(existsSync(prepared('packages', 'ui')), false, 'no upstream UI package is staged');
  const plugins = existsSync(prepared('plugins')) ? readdirSync(prepared('plugins')) : [];
  assert.deepEqual(plugins.filter(plugin => existsSync(prepared('plugins', plugin, 'src', 'components'))), [],
    'no upstream plugin React components are staged');
}

/** Asserts an esbuild metafile bundled `local` and read nothing from upstream UI, staged or pinned. */
export function assertBundlesLocalUi(metafile, ...local) {
  const inputs = Object.keys(metafile.inputs);
  for (const path of local) {
    assert.ok(path.startsWith('apps/app/src/ui/'), path);
    assert.ok(inputs.includes(path), `the bundle executes Alpha's ${path}`);
  }
  const upstream = inputs.filter(path => {
    const relative = path.replace(/^(?:\.eliza\/client-features|vendor\/eliza)\//, '');
    return relative !== path && upstreamUi(relative);
  });
  assert.deepEqual(upstream, [], 'the bundle reads no upstream UI');
}
