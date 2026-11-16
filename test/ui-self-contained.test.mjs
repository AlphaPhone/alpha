// Alpha's renderer UI is self-contained in apps/app/src/ui (plus its own map renderer in
// apps/app/src/maps/map-plane.ts): no app module imports or loads upstream elizaOS UI, the local
// UI tree reaches upstream only through the framework-free contract, protocol and native-bridge
// aliases, both resolvers point only at Alpha modules or the staged non-UI upstream tree, and the
// prepared upstream source selection names no UI. The staged tree itself is checked in
// test/client-feature-preparation.test.mjs.
//
// Upstream UI is recognised two ways. By name: packages/ui, @elizaos/ui, the React directories
// of plugins and packages/app, and the plugin-maps renderer Alpha replaced. By what it is: the
// resolved module graph of every apps/app/src module (bundled with the vite.config.ts aliases)
// loads no upstream JSX/TSX, React, @elizaos/ui, stylesheet or DOM-building module, whatever
// its path.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {loadConfigFromFile} from 'vite';
import {CLIENT_FEATURE_PATHS} from '../scripts/prepare-client-features.ts';

const ROOT = process.cwd();
const listed = (...paths) => execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', ...paths], {encoding: 'utf8'})
  .split('\0').filter(file => file && !file.startsWith('specs/quint/.wave/') && fs.existsSync(file) && fs.statSync(file).isFile());
const sources = listed('apps/app/src').filter(file => /\.(?:ts|tsx|js|mjs)$/.test(file));
const specifiers = file => [...fs.readFileSync(file, 'utf8')
  .matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+|\bexport\s+\*\s+from\s*)(['"])([^'"\n]+)\1/gm)].map(match => match[2]);
// Upstream UI by name: packages/ui (and its @elizaos/ui package name), the React directories of
// plugins and of packages/app, and the plugin-maps renderer that Alpha's map-plane replaced.
const UPSTREAM_UI = /(?:^@elizaos\/ui(?:\/|$)|(?:^|\/)packages\/ui\/|(?:^|\/)packages\/app\/src\/(?:renderer|shims)\/|(?:^|\/)plugins\/[^/]+\/src\/(?:components|ui|hooks|views|companion)\/|(?:^|\/)plugins\/plugin-maps\/src\/client\/map-plane\b)/;
// The one upstream-facing name kept for UI: upstream plugin-notes types its fetch with
// @elizaos/ui/api/transport, which both resolvers map to Alpha's own module.
const TRANSPORT_SPECIFIER = '@elizaos/ui/api/transport';
const TRANSPORT = 'apps/app/src/ui/api/transport.ts';
const NOTES_API = '.eliza/client-features/plugins/plugin-notes/src/client/notes-api.ts';
const STAGED = '.eliza/client-features';
const MAP_PLANE_TYPE_SOURCE = 'plugins/plugin-maps/src/client/map-plane.ts';
const stamp = JSON.parse(fs.readFileSync(path.join(STAGED, '.source.json'), 'utf8'));
// Upstream files an app module loads straight from the submodule. Each is reviewed framework-free
// logic (no DOM, no React); anything else from vendor/eliza has to be staged or copied into Alpha.
const VENDOR_RUNTIME = new Map([
  ['vendor/eliza/packages/core/src/utils/uuid.ts', 'UUID validation'],
  ['vendor/eliza/plugins/plugin-native-passwords/src/bindings.ts', 'password binding helpers'],
  ['vendor/eliza/plugins/plugin-native-passwords/src/client.ts', 'native passwords bridge client'],
  ['vendor/eliza/plugins/plugin-native-passwords/src/transfer.ts', 'password transfer bridge client'],
]);
// Runtime dependencies that no app module imports, with where each one is used instead.
const UNIMPORTED_DEPENDENCIES = new Map([
  ['@capacitor/android', 'android/consumer-host.json'],
  ['tesseract.js', 'scripts/local-ocr-assets.ts'],
  ['@tesseract.js-data/eng', 'scripts/local-ocr-assets.ts'],
]);

test('no app module imports upstream UI', () => {
  assert.ok(sources.some(file => file.startsWith('apps/app/src/ui/')), 'the local UI tree is scanned');
  const offenders = sources.flatMap(file => specifiers(file)
    .filter(spec => UPSTREAM_UI.test(spec) || (/(?:^|\/)(?:vendor\/eliza|\.eliza\/client-features)\//.test(spec) && /\.[jt]sx$/.test(spec)))
    .map(spec => `${file}: ${spec}`));
  assert.deepEqual(offenders, []);
});

let graph;
/** Every apps/app/src module bundled with the evaluated vite.config.ts aliases. */
async function appGraph() {
  if (graph) return graph;
  const {config} = await loadConfigFromFile({command: 'build', mode: 'production'}, path.resolve('vite.config.ts'), undefined, 'silent');
  const alias = config.resolve.alias;
  const keys = Object.keys(alias).sort((a, b) => b.length - a.length);
  const result = await build({
    entryPoints: sources.filter(file => !file.endsWith('.d.ts')), bundle: true, write: false, metafile: true,
    outdir: path.join(ROOT, 'test-results/ui-self-contained'), format: 'esm', splitting: true, platform: 'browser', logLevel: 'silent',
    jsx: 'automatic', packages: 'external',
    loader: {'.html': 'text', '.css': 'empty', '.svg': 'empty', '.woff2': 'empty', '.png': 'empty'},
    plugins: [{name: 'vite-aliases', setup(builder) {
      // Vite asset queries (?url, ?raw, ?worker) are not module code.
      builder.onResolve({filter: /\?/}, args => ({path: args.path, external: true}));
      builder.onResolve({filter: /^[@a-z]/}, args => {
        const key = keys.find(name => args.path === name || args.path.startsWith(name + '/'));
        return key ? {path: alias[key] + args.path.slice(key.length)} : undefined;
      });
    }}],
  });
  // A worktree may share the prepared tree through a symlink; name its files by the local path.
  const stagedReal = fs.realpathSync(STAGED);
  const local = file => {
    const absolute = path.resolve(file);
    return path.relative(ROOT, absolute.startsWith(stagedReal + path.sep) ? path.join(ROOT, STAGED, path.relative(stagedReal, absolute)) : absolute);
  };
  const inputs = Object.entries(result.metafile.inputs).map(([file, meta]) => ({file: local(file), imports: meta.imports}));
  return graph = {inputs, upstream: inputs.filter(input => !input.file.startsWith('apps/'))};
}

test('the resolved app module graph loads no upstream UI', async () => {
  const {inputs, upstream} = await appGraph();
  assert.ok(inputs.length > sources.length / 2 && upstream.length > 50, 'the app graph and its upstream modules were bundled');
  const offenders = [];
  for (const {file, imports} of upstream) {
    if (UPSTREAM_UI.test(file)) offenders.push(`${file}: upstream UI path`);
    if (/\.(?:[jt]sx|css)$/.test(file)) offenders.push(`${file}: upstream component or stylesheet`);
    for (const {path: target} of imports) {
      if (/^(?:react|react-dom|preact)(?:\/|$)/.test(target)) offenders.push(`${file}: imports ${target}`);
      if (/^@elizaos\/ui(?:\/|$)/.test(target) && !(file === NOTES_API && target === TRANSPORT_SPECIFIER)) offenders.push(`${file}: imports ${target}`);
      if (/^maplibre-gl(?:\/|$)/.test(target)) offenders.push(`${file}: imports the map renderer ${target}`);
    }
    // Upstream logic may make offscreen helpers (a canvas, a download link, a file input, a
    // parsing template); it never builds visible elements or styles them.
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(/createElement(?:NS)?\(\s*(?:"[^"]*",\s*)?["'`]([^"'`]+)["'`]/g))
      if (!['canvas', 'a', 'input', 'template', 'textarea'].includes(match[1])) offenders.push(`${file}: creates <${match[1]}>`);
    if (/\.style\.(?:cssText|setProperty\b|[a-zA-Z]+\s*=(?!=))/.test(text)) offenders.push(`${file}: sets inline styles`);
    if (/\.(?:innerHTML|outerHTML)\s*=(?!=)|insertAdjacentHTML\(/.test(text) && !/document\.createElement\(\s*["'](?:template|textarea)["']\s*\)/.test(text))
      offenders.push(`${file}: writes markup`);
  }
  assert.deepEqual(offenders, []);
  // Upstream modules come from the prepared non-UI tree, or are reviewed submodule files.
  assert.deepEqual(upstream.map(input => input.file).filter(file => file.startsWith(STAGED + '/')
    ? !stamp.files[path.relative(STAGED, file)] : !VENDOR_RUNTIME.has(file)), []);
  assert.deepEqual([...VENDOR_RUNTIME.keys()].filter(file => !upstream.some(input => input.file === file)), [], 'a reviewed submodule file that is no longer loaded is removed from the list');
});

test('every runtime dependency is reached by the app graph or has a recorded use', async () => {
  const {inputs} = await appGraph();
  const packageName = specifier => specifier.split('/').slice(0, specifier.startsWith('@') ? 2 : 1).join('/');
  const imported = new Set(inputs.flatMap(input => input.imports.filter(entry => entry.external && /^[@a-z]/.test(entry.path)).map(entry => packageName(entry.path.split('?')[0]))));
  const dependencies = Object.keys(JSON.parse(fs.readFileSync('package.json', 'utf8')).dependencies);
  assert.deepEqual(dependencies.filter(name => !imported.has(name) && !UNIMPORTED_DEPENDENCIES.has(name)), [], 'no runtime dependency is left over from removed UI');
  for (const [name, user] of UNIMPORTED_DEPENDENCIES) {
    assert.ok(dependencies.includes(name) && !imported.has(name), `${name} is an unimported runtime dependency`);
    assert.ok(fs.readFileSync(user, 'utf8').includes(name), `${user} uses ${name}`);
  }
});

// Text, not import syntax: this catches every form (static, side-effect, dynamic or template
// imports, require, new URL, CSS/HTML references, esbuild entry points and file reads in tests).
const UPSTREAM_UI_TEXT = /(?:client-features|vendor\/eliza)\/packages\/ui\b|\bpackages\/ui\/src\b|\bui\/src\/|@elizaos\/ui(?!\/api\/transport\b)|plugins\/plugin-[a-z-]+\/src\/(?:components|ui|hooks|views|companion)\/|packages\/app\/src\/(?:renderer|shims)\/|plugins\/plugin-maps\/src\/client\/map-plane\b/g;
// Each exemption names the exact reference text it allows. A whole file is exempt only when it is
// documentation or a test that names upstream UI to assert it is absent; never app code.
const TEXT_EXEMPT = new Map([
  // Provenance of the local UI tree: the upstream subpath each module was copied from.
  ['apps/app/src/ui/README.md', {reason: 'provenance', file: true}],
  // Licence attribution for an adapted upstream waveform; provenance only.
  ['apps/app/src/prototype/voice-activity.tsx', {reason: 'licence attribution', text: ['Source: packages/ui/src/components/shell/ChatOverlay.tsx']}],
  // Describes upstream's own Cloud web front end, not an Alpha source.
  ['docs/standalone-cloud-plan.md', {reason: 'upstream description', text: ['`packages/ui/src/cloud`']}],
  // Synthetic resident-build fixture paths, not Alpha sources.
  ['test/resident-build-output.test.mjs', {reason: 'synthetic fixture', file: true}],
  // Asserts the prepared tree stages no upstream UI.
  ['test/client-feature-preparation.test.mjs', {reason: 'negative assertion', file: true}],
  // Names the replaced map renderer to assert that no conformance bundle reads it.
  ['test/support/quint-conformance-ui-staging.mjs', {reason: 'negative assertion', text: ["const mapRenderer = 'plugins/plugin-maps/src/client/map-plane.ts';"]}],
  ['test/ui-self-contained.test.mjs', {reason: 'this guard', file: true}],
]);
const scanned = () => listed('apps', 'scripts', 'specs', 'test', 'android', 'docs', 'cloud', '.github',
  'README.md', 'CONTRIBUTING.md', 'AGENTS.md', 'vite.config.ts', 'tsconfig.json', 'playwright.config.ts', 'capacitor.config.ts',
  'lemmascript.json', 'LemmaScript-files.txt', 'package.json');
const references = text => [...text.matchAll(UPSTREAM_UI_TEXT)].length;

test('no source, script, spec, test or document refers to upstream UI', () => {
  const files = scanned();
  assert.ok(files.length > 1000 && files.some(file => file.startsWith('android/')) && files.some(file => file.startsWith('docs/')), 'scanned the repository');
  const offenders = [];
  for (const file of files) {
    const exempt = TEXT_EXEMPT.get(file);
    if (exempt?.file) continue;
    let text = fs.readFileSync(file, 'latin1');
    for (const allowed of exempt?.text ?? []) text = text.split(allowed).join('');
    if (references(text)) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
  for (const [file, exempt] of TEXT_EXEMPT) {
    assert.ok(exempt.file ? !/^apps\/.*\.(?:[cm]?[jt]sx?|css|html)$/.test(file) : exempt.text?.length, `${file}: app code is exempt only line by line`);
    // An exemption that no longer applies is removed rather than left to cover a future reference.
    assert.ok(fs.existsSync(file), `${file} exists`);
    const text = fs.readFileSync(file, 'latin1');
    if (exempt.file) assert.ok(references(text), `${file} still refers to upstream UI`);
    else for (const allowed of exempt.text) assert.ok(text.includes(allowed) && references(allowed), `${file} still has: ${allowed}`);
  }
});

test('the local UI tree imports only itself, packages and non-UI upstream aliases', () => {
  const root = path.resolve('apps/app/src/ui');
  const offenders = [];
  for (const file of sources.filter(file => file.startsWith('apps/app/src/ui/'))) {
    for (const spec of specifiers(file)) {
      if (spec.startsWith('.')) {
        const target = path.resolve(path.dirname(file), spec.split('?')[0]);
        if (!target.startsWith(root + path.sep)) offenders.push(`${file}: ${spec}`);
      } else if (UPSTREAM_UI.test(spec) || spec.includes('client-features') || spec.includes('vendor/')) {
        offenders.push(`${file}: ${spec}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

/** Where an alias target may point: Alpha's sources, or a staged non-UI upstream file. */
function aliasOffence(name, target) {
  const file = path.relative(ROOT, path.resolve(ROOT, target));
  if (name.startsWith('@elizaos/ui')) return name === TRANSPORT_SPECIFIER && file === TRANSPORT ? null : 'names upstream UI';
  if (file.startsWith('apps/app/src/')) return null;
  if (!file.startsWith(STAGED + '/')) return 'points outside Alpha sources and the staged tree';
  const staged = path.relative(STAGED, file).replace(/\*$/, '');
  if (UPSTREAM_UI.test(staged) || /\.[jt]sx$/.test(staged)) return 'points at upstream UI';
  return Object.keys(stamp.files).some(entry => staged.endsWith('/') ? entry.startsWith(staged) : entry === staged) ? null : 'points at an unstaged file';
}

test('resolver aliases resolve only to Alpha modules or staged non-UI upstream files', async () => {
  const {config} = await loadConfigFromFile({command: 'build', mode: 'production'}, path.resolve('vite.config.ts'), undefined, 'silent');
  const vite = Object.entries(config.resolve.alias);
  assert.ok(vite.length > 10, 'the evaluated vite aliases were read');
  assert.deepEqual(vite.map(([name, target]) => [name, aliasOffence(name, target)]).filter(([, offence]) => offence), []);
  assert.deepEqual(vite.filter(([name]) => name.startsWith('@elizaos/ui')).map(([name, target]) => [name, path.relative(ROOT, target)]), [[TRANSPORT_SPECIFIER, TRANSPORT]]);
  const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  const paths = Object.entries(tsconfig.compilerOptions.paths).flatMap(([name, targets]) => targets.map(target => [name, target]));
  assert.deepEqual(paths.map(([name, target]) => [name, aliasOffence(name, target)]).filter(([, offence]) => offence), []);
  assert.deepEqual(paths.filter(([name]) => name.startsWith('@elizaos/ui')), [[TRANSPORT_SPECIFIER, './' + TRANSPORT]]);
  assert.equal(tsconfig.include.some(entry => /packages\/ui|vendor\//.test(entry)), false);
});

test('the prepared upstream source selection names no UI', () => {
  assert.deepEqual(CLIENT_FEATURE_PATHS.filter(prefix => /^packages\/ui(?:\/|$)|^plugins\/[^/]+\/src\/(?:components|ui|hooks|views|companion)(?:\/|$)|^packages\/app\/src\/(?:renderer|shims)(?:\/|$)|\.[jt]sx$/.test(prefix)), []);
  // A selected directory brings no upstream React component with it at the pinned revision.
  // Read the submodule's own tree even when a hook exports this repository's git environment.
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^GIT_(?:DIR|INDEX_FILE|WORK_TREE)$/.test(name)));
  const tracked = execFileSync('git', ['-C', 'vendor/eliza', 'ls-tree', '-r', '-z', '--name-only', 'HEAD', '--', ...CLIENT_FEATURE_PATHS], {encoding: 'utf8', env}).split('\0').filter(Boolean);
  assert.ok(tracked.length > CLIENT_FEATURE_PATHS.length / 2, 'the pinned selection is listed');
  // Upstream maps-screen.ts names the plugin-maps renderer's overlay type, so that one file is
  // staged with its directory; the graph test above shows that no Alpha module loads it.
  assert.deepEqual(tracked.filter(file => /\.(?:[jt]sx|css)$/.test(file) || (UPSTREAM_UI.test(file) && file !== MAP_PLANE_TYPE_SOURCE)), []);
});
