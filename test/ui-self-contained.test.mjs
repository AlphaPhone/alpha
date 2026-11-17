// Alpha's renderer UI is self-contained in apps/app/src/ui (plus its own map renderer in
// apps/app/src/maps/map-plane.ts): no app module imports or loads upstream elizaOS UI, the local
// UI tree reaches upstream only through the framework-free contract, protocol and native-bridge
// aliases, both resolvers point only at Alpha modules or the staged non-UI upstream tree, and the
// prepared upstream source selection names no UI. The staged tree itself is checked in
// test/client-feature-preparation.test.mjs.
//
// Upstream UI is recognised two ways. By name: packages/ui, @elizaos/ui and the React directories
// of plugins and packages/app. By what it is: the resolved module graph of every apps/app/src
// module (bundled with the vite.config.ts aliases) loads no upstream JSX/TSX, React, @elizaos/ui,
// MapLibre, stylesheet or DOM-building module, whatever its path; the TypeScript program reached
// from apps/app/src (type-only imports included) does the same; Vite asset and worker queries
// never load upstream files; every staged upstream file, bundled or not, builds no DOM; and no
// staged upstream file presents a screen (render or view hooks, DOM event or element parameters,
// toasts with literal copy): Alpha owns every screen controller and its owner-facing copy.
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
/** Files referenced as URLs (`new URL('…', import.meta.url)`), which a bundler emits as assets. */
const urlReferences = file => [...fs.readFileSync(file, 'utf8')
  .matchAll(/\bnew\s+URL\(\s*(['"`])([^'"`\n]+)\1\s*,\s*import\.meta\.url/g)].map(match => match[2]);
const UPSTREAM_TREE = /(?:^|\/)(?:vendor\/eliza|\.eliza\/client-features)\//;
// Upstream UI by name: packages/ui (and its @elizaos/ui package name) and the React directories
// of plugins and of packages/app.
const UPSTREAM_UI = /(?:^@elizaos\/ui(?:\/|$)|(?:^|\/)packages\/ui\/|(?:^|\/)packages\/app\/src\/(?:renderer|shims)\/|(?:^|\/)plugins\/[^/]+\/src\/(?:components|ui|hooks|views|companion)\/)/;
// The one upstream-facing name kept for UI: upstream plugin-notes types its fetch with
// @elizaos/ui/api/transport, which both resolvers map to Alpha's own module.
const TRANSPORT_SPECIFIER = '@elizaos/ui/api/transport';
const TRANSPORT = 'apps/app/src/ui/api/transport.ts';
const NOTES_API = '.eliza/client-features/plugins/plugin-notes/src/client/notes-api.ts';
const STAGED = '.eliza/client-features';
const stamp = JSON.parse(fs.readFileSync(path.join(STAGED, '.source.json'), 'utf8'));
/** The package a bare specifier names. */
// A worktree may share the prepared tree or the vendor checkout through a symlink; name their
// files by the local path, whatever path a resolver or tsc reports.
const local = file => {
  const absolute = path.resolve(file);
  for (const dir of [STAGED, 'vendor/eliza']) {
    const real = fs.existsSync(dir) ? fs.realpathSync(dir) : null;
    if (real && absolute.startsWith(real + path.sep)) return path.relative(ROOT, path.join(ROOT, dir, path.relative(real, absolute)));
  }
  return path.relative(ROOT, absolute);
};
const packageName = specifier => specifier.split('/').slice(0, specifier.startsWith('@') ? 2 : 1).join('/');
const CODE = /\.(?:[cm]?[jt]sx?)$/;
/**
 * What a module is, whatever its path: upstream logic may make offscreen helpers (a canvas, a
 * parsing template or textarea); it never builds visible elements, styles them or writes markup,
 * and never imports React, MapLibre or upstream UI. Download links and file inputs are Alpha's
 * (apps/app/src/browser/download.ts and file-picker.ts): a staged module takes them as host ports.
 */
function uiShapeOffences(file, text) {
  const offences = [];
  for (const match of text.matchAll(/createElement(?:NS)?\(\s*(?:"[^"]*",\s*)?["'`]([^"'`]+)["'`]/g))
    if (!['canvas', 'template', 'textarea'].includes(match[1])) offences.push(`${file}: creates <${match[1]}>`);
  if (/\.style\.(?:cssText|setProperty\b|[a-zA-Z]+\s*=(?!=))/.test(text)) offences.push(`${file}: sets inline styles`);
  if (/\.(?:innerHTML|outerHTML)\s*=(?!=)|insertAdjacentHTML\(/.test(text) && !/document\.createElement\(\s*["'](?:template|textarea)["']\s*\)/.test(text))
    offences.push(`${file}: writes markup`);
  for (const spec of [...text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+|\bexport\s+\*\s+from\s*)(['"])([^'"\n]+)\1/gm)].map(match => match[2])) {
    if (/^(?:react|react-dom|preact|maplibre-gl)(?:\/|$)/.test(spec)) offences.push(`${file}: imports ${spec}`);
    if (/^@elizaos\/ui(?:\/|$)/.test(spec) && !(file === NOTES_API && spec === TRANSPORT_SPECIFIER)) offences.push(`${file}: imports ${spec}`);
  }
  return offences;
}
// Screen presentation, whatever the path: a module that assigns a host view's `render`, declares a
// `render()` or `view()` hook for a host to draw, takes DOM events or elements as parameters, or
// shows a toast with literal copy is a screen controller or view-model. Alpha owns those in
// apps/app/src/ui; the staged tree keeps only the contracts, protocols, bridges and data rules
// they call. Comments are blanked first so documentation that names a hook does not count.
const DOM_PARAMETER = /[(,]\s*[A-Za-z_$][\w$]*\??\s*:\s*((?:UI|Keyboard|Pointer|Mouse|Touch|Focus|Input|Wheel|Drag|Clipboard)?Event|HTML[A-Za-z]*Element|Element)\b/g;
const SCREEN_HOOK = /^[ \t]*(?:export\s+)?(?:async\s+)?(?:function\s*\*?\s*)?(render|view)\s*(?:<[^>\n]*>)?\([^)]*\)\s*(:[^;{=\n]+)?([{;])|^[ \t]*(?:export\s+)?(?:const|let)?\s*(render|view)\s*[:=]\s*(?:async\s*)?\(/gm;
function presentationOffences(file, text) {
  const code = text.replace(/\/\*[\s\S]*?\*\//g, comment => comment.replace(/[^\n]/g, ' ')).replace(/(^|[^:"'`\\])\/\/.*$/gm, '$1');
  const at = index => `${file}:${code.slice(0, index).split('\n').length}`;
  const offences = [];
  for (const match of code.matchAll(/\.render\s*=(?!=)/g)) offences.push(`${at(match.index)}: assigns a host view's render`);
  // A bare `render();` call is not a declaration; a declaration has a body or a return type.
  for (const match of code.matchAll(SCREEN_HOOK)) if (match[4] || match[3] === '{' || match[2]) offences.push(`${at(match.index)}: declares a ${match[1] || match[4]}() screen hook`);
  for (const match of code.matchAll(DOM_PARAMETER)) offences.push(`${at(match.index)}: takes a DOM ${match[1]} parameter`);
  for (const match of code.matchAll(/\btoast\s*\(\s*["'`]/g)) offences.push(`${at(match.index)}: shows a toast with literal copy`);
  return offences;
}
// Upstream files an app module loads straight from the submodule. Each is reviewed framework-free
// logic (no DOM, no React, no owner-facing copy shown as written); anything else from vendor/eliza
// has to be staged or copied into Alpha. The Passwords screen's failure wording, website check
// wording and list search are Alpha's (apps/app/src/ui/passwords/passwords-presentation.ts).
const VENDOR_RUNTIME = new Map([
  ['vendor/eliza/packages/core/src/utils/uuid.ts', 'UUID validation'],
  ['vendor/eliza/plugins/plugin-native-passwords/src/bindings.ts', 'password website normalization'],
  ['vendor/eliza/plugins/plugin-native-passwords/src/client.ts', 'native passwords bridge client and failure codes'],
  ['vendor/eliza/plugins/plugin-native-passwords/src/transfer.ts', 'password transfer bridge client'],
]);
// Upstream submodule files the TypeScript program reaches from app modules only through type-only
// imports (erased from the bundle). Each is reviewed framework-free declarations or logic.
const VENDOR_TYPES = new Map([
  ...['index', 'definitions', 'sense', 'sense-bridge', 'sense-web', 'web'].map(name =>
    [`vendor/eliza/plugins/plugin-native-system/src/${name}.ts`, 'System plugin type (apps/app/src/native.ts)']),
  ['vendor/eliza/plugins/plugin-native-passwords/src/definitions.ts', 'password plugin declarations'],
  ...['types/primitives', 'types/interactions', 'types/json', 'types/reminder-presentation', 'types/system-notice', 'ambient-context', 'errors', 'utils/errors'].map(name =>
    [`vendor/eliza/packages/core/src/${name}.ts`, 'UUID type behind the UUID validation helper']),
]);
// Runtime dependencies that no app module imports, with where each one is used instead.
const UNIMPORTED_DEPENDENCIES = new Map([
  ['@capacitor/android', 'android/consumer-host.json'],
  ['tesseract.js', 'scripts/local-ocr-assets.ts'],
  ['@tesseract.js-data/eng', 'scripts/local-ocr-assets.ts'],
]);

test('no app module imports upstream UI', () => {
  assert.ok(sources.some(file => file.startsWith('apps/app/src/ui/')), 'the local UI tree is scanned');
  const offenders = sources.flatMap(file => [
    ...specifiers(file).filter(spec => UPSTREAM_UI.test(spec) || (UPSTREAM_TREE.test(spec) && (/\.[jt]sx(?:\?|$)/.test(spec) || spec.includes('?')))),
    // An upstream file loaded as an asset, worker or raw text is outside the module graph.
    ...urlReferences(file).filter(spec => UPSTREAM_UI.test(spec) || UPSTREAM_TREE.test(spec)),
  ].map(spec => `${file}: ${spec}`));
  assert.deepEqual(offenders, []);
});

let graph;
/** Every apps/app/src module bundled with the evaluated vite.config.ts aliases. */
async function appGraph() {
  if (graph) return graph;
  const {config} = await loadConfigFromFile({command: 'build', mode: 'production'}, path.resolve('vite.config.ts'), undefined, 'silent');
  const alias = config.resolve.alias;
  const keys = Object.keys(alias).sort((a, b) => b.length - a.length);
  const queried = [];
  const result = await build({
    entryPoints: sources.filter(file => !file.endsWith('.d.ts')), bundle: true, write: false, metafile: true,
    outdir: path.join(ROOT, 'test-results/ui-self-contained'), format: 'esm', splitting: true, platform: 'browser', logLevel: 'silent',
    jsx: 'automatic', packages: 'external',
    loader: {'.html': 'text', '.css': 'empty', '.svg': 'empty', '.woff2': 'empty', '.png': 'empty'},
    plugins: [{name: 'vite-aliases', setup(builder) {
      // Vite asset queries (?url, ?raw, ?worker) are not module code here, but Vite still ships
      // their target: one that resolves into the submodule or the staged tree is an offender.
      builder.onResolve({filter: /\?/}, args => {
        const bare = args.path.split('?')[0];
        const key = keys.find(name => bare === name || bare.startsWith(name + '/'));
        const target = bare.startsWith('.') ? path.resolve(args.resolveDir, bare) : key ? alias[key] + bare.slice(key.length) : path.isAbsolute(bare) ? bare : null;
        if (target && !/^(?:apps|node_modules)\//.test(local(target))) queried.push(`${local(args.importer)}: ${args.path}`);
        return {path: args.path, external: true};
      });
      builder.onResolve({filter: /^[@a-z]/}, args => {
        const key = keys.find(name => args.path === name || args.path.startsWith(name + '/'));
        return key ? {path: alias[key] + args.path.slice(key.length)} : undefined;
      });
    }}],
  });
  const inputs = Object.entries(result.metafile.inputs).map(([file, meta]) => ({file: local(file), imports: meta.imports}));
  return graph = {inputs, queried, upstream: inputs.filter(input => !input.file.startsWith('apps/'))};
}

test('the resolved app module graph loads no upstream UI', async () => {
  const {inputs, queried, upstream} = await appGraph();
  assert.ok(inputs.length > sources.length / 2 && upstream.length > 50, 'the app graph and its upstream modules were bundled');
  assert.deepEqual(queried, [], 'no asset, raw or worker query loads an upstream file');
  const offenders = [];
  for (const {file, imports} of upstream) {
    if (UPSTREAM_UI.test(file)) offenders.push(`${file}: upstream UI path`);
    if (/\.(?:[jt]sx|css)$/.test(file)) offenders.push(`${file}: upstream component or stylesheet`);
    for (const {path: target} of imports) {
      if (/^(?:react|react-dom|preact|maplibre-gl)(?:\/|$)/.test(target)) offenders.push(`${file}: imports ${target}`);
      if (/^@elizaos\/ui(?:\/|$)/.test(target) && !(file === NOTES_API && target === TRANSPORT_SPECIFIER)) offenders.push(`${file}: imports ${target}`);
    }
    offenders.push(...uiShapeOffences(file, fs.readFileSync(file, 'utf8')));
  }
  assert.deepEqual([...new Set(offenders)], []);
  // Every upstream package name is aliased to an Alpha module or a staged file; any other bare
  // import is a declared package of this repository.
  const manifest = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const declared = new Set([...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.devDependencies ?? {})]);
  const externals = inputs.flatMap(({file, imports}) => imports.filter(entry => entry.external && /^[@a-z]/.test(entry.path)).map(entry => [file, entry.path.split('?')[0]]));
  assert.ok(externals.length > 20, 'the external package imports were listed');
  assert.deepEqual(externals.filter(([, spec]) => spec.startsWith('@elizaos/') || !declared.has(packageName(spec))).map(([file, spec]) => `${file}: ${spec}`), [],
    'every external import is a declared package, never an unaliased @elizaos name');
  // Upstream modules come from the prepared non-UI tree, or are reviewed submodule files.
  assert.deepEqual(upstream.map(input => input.file).filter(file => file.startsWith(STAGED + '/')
    ? !stamp.files[path.relative(STAGED, file)] : !VENDOR_RUNTIME.has(file)), []);
  assert.deepEqual([...VENDOR_RUNTIME.keys()].filter(file => !upstream.some(input => input.file === file)), [], 'a reviewed submodule file that is no longer loaded is removed from the list');
});

test('the TypeScript program reached from app modules loads no upstream UI, type-only imports included', () => {
  // The bundle drops type-only imports; tsc keeps them. Walk the import edges tsc reports.
  const explained = execFileSync(path.join('node_modules', '.bin', 'tsc'), ['-p', 'tsconfig.json', '--listFilesOnly', '--explainFiles'], {encoding: 'utf8', maxBuffer: 64 << 20});
  const importers = new Map();
  let current;
  for (const line of explained.split('\n')) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) { current = local(line.trim()); importers.set(current, []); continue; }
    const edge = line.match(/^\s+Imported via .* from file '([^']+)'/);
    if (edge && current) importers.get(current).push(local(edge[1]));
  }
  const reached = new Set([...importers.keys()].filter(file => file.startsWith('apps/app/src/')));
  assert.ok(reached.size > sources.length / 2, 'tsc listed the app modules');
  for (let grew = true; grew;) {
    grew = false;
    for (const [file, by] of importers) if (!reached.has(file) && by.some(importer => reached.has(importer))) { reached.add(file); grew = true; }
  }
  const upstream = [...reached].filter(file => !file.startsWith('apps/') && !/(?:^|\/)node_modules\//.test(file));
  assert.ok(upstream.length > 50, 'tsc reached the staged upstream modules');
  const offenders = [];
  for (const file of upstream) {
    if (file.startsWith(STAGED + '/') ? !stamp.files[path.relative(STAGED, file)] : !VENDOR_RUNTIME.has(file) && !VENDOR_TYPES.has(file))
      offenders.push(`${file}: neither staged nor a reviewed submodule file`);
    if (UPSTREAM_UI.test(file) || /\.(?:[jt]sx|css)$/.test(file)) offenders.push(`${file}: upstream UI path`);
    offenders.push(...uiShapeOffences(file, fs.readFileSync(file, 'utf8')));
  }
  assert.deepEqual(offenders, []);
  assert.deepEqual([...VENDOR_TYPES.keys()].filter(file => !reached.has(file)), [], 'a reviewed submodule type file that is no longer reached is removed from the list');
});

test('no staged upstream file builds DOM, bundled or not', () => {
  const staged = Object.keys(stamp.files).filter(file => CODE.test(file));
  assert.ok(staged.length > 100, 'the staged code was listed');
  assert.deepEqual(staged.flatMap(file => uiShapeOffences(path.join(STAGED, file), fs.readFileSync(path.join(STAGED, file), 'utf8'))), []);
});

test('no staged upstream file presents a screen, bundled or not', () => {
  const staged = Object.keys(stamp.files).filter(file => CODE.test(file));
  assert.ok(staged.length > 100, 'the staged code was listed');
  assert.deepEqual(staged.flatMap(file => presentationOffences(path.join(STAGED, file), fs.readFileSync(path.join(STAGED, file), 'utf8'))), []);
  // The rules recognise the screen controllers Alpha took over (read at the pin, unstaged).
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^GIT_(?:DIR|INDEX_FILE|WORK_TREE)$/.test(name)));
  const pinned = file => execFileSync('git', ['-C', 'vendor/eliza', 'show', `HEAD:${file}`], {encoding: 'utf8', env, maxBuffer: 64 << 20});
  for (const [file, rule] of [
    ['plugins/plugin-maps/src/client/maps-screen.ts', /view\(\) screen hook|toast with literal copy/],
    ['plugins/plugin-files/src/browser/files-browser-adapter.ts', /render|DOM KeyboardEvent parameter/],
    ['plugins/plugin-inbox/src/mailbox/review-controller.ts', /render\(\) screen hook/],
    ['plugins/plugin-inbox/src/mailbox/drafts-controller.ts', /toast with literal copy/],
    ['plugins/plugin-native-system/src/client/shade.ts', /DOM TouchEvent parameter/],
  ]) {
    assert.equal(stamp.files[file], undefined, `${file} is Alpha's, not staged`);
    assert.ok(presentationOffences(file, pinned(file)).some(offence => rule.test(offence)), `${file} is recognised as screen presentation`);
  }
});

test('every runtime dependency is reached by the app graph or has a recorded use', async () => {
  const {inputs} = await appGraph();
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
const UPSTREAM_UI_TEXT = /(?:client-features|vendor\/eliza)\/packages\/ui\b|\bpackages\/ui\/src\b|\bui\/src\/|@elizaos\/ui(?!\/api\/transport\b)|plugins\/plugin-[a-z-]+\/src\/(?:components|ui|hooks|views|companion)\/|packages\/app\/src\/(?:renderer|shims)\//g;
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
  assert.deepEqual(tracked.filter(file => /\.(?:[jt]sx|css)$/.test(file) || UPSTREAM_UI.test(file)), []);
  // Nor a module that builds DOM, read as it is staged: pinned, or as projected when the receipt
  // records a projection (a selected file not staged yet is read from the pin).
  const pinned = file => execFileSync('git', ['-C', 'vendor/eliza', 'show', `HEAD:${file}`], {encoding: 'utf8', env, maxBuffer: 64 << 20});
  const asStaged = file => stamp.files[file] && stamp.files[file] !== stamp.sourceFiles[file] ? fs.readFileSync(path.join(STAGED, file), 'utf8') : pinned(file);
  assert.deepEqual(tracked.filter(file => CODE.test(file)).flatMap(file => uiShapeOffences(path.join(STAGED, file), asStaged(file))), []);
  assert.deepEqual(tracked.filter(file => CODE.test(file)).flatMap(file => presentationOffences(path.join(STAGED, file), asStaged(file))), []);
});
