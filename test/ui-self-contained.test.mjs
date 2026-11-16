// Alpha's renderer UI is self-contained in apps/app/src/ui: no app module imports upstream
// elizaOS UI (packages/ui or a plugin's React components), and the local UI tree reaches
// upstream only through the framework-free contract, protocol and native-bridge aliases.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const sources = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', 'apps/app/src'], {encoding: 'utf8'})
  .split('\n').filter(file => /\.(?:ts|tsx|js|mjs)$/.test(file) && fs.existsSync(file));
const specifiers = file => [...fs.readFileSync(file, 'utf8')
  .matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+)(['"])([^'"\n]+)\1/gm)].map(match => match[2]);
const UPSTREAM_UI = /(?:^@elizaos\/ui(?:\/|$)|(?:^|\/)packages\/ui\/|(?:^|\/)plugins\/[^/]+\/src\/components\/)/;
// The one upstream-facing name kept for UI: upstream plugin-notes types its fetch with
// @elizaos/ui/api/transport, which both resolvers map to Alpha's own module.
const TRANSPORT = 'apps/app/src/ui/api/transport.ts';

test('no app module imports upstream UI', () => {
  const offenders = sources.flatMap(file => specifiers(file).filter(spec => UPSTREAM_UI.test(spec)).map(spec => `${file}: ${spec}`));
  assert.deepEqual(offenders, []);
});

// Text, not import syntax: this catches every form (static, side-effect, dynamic or template
// imports, require, new URL, CSS/HTML references, esbuild entry points and file reads in tests).
const UPSTREAM_UI_TEXT = /(?:client-features|vendor\/eliza)\/packages\/ui\b|\bpackages\/ui\/src\b|@elizaos\/ui(?!\/api\/transport\b)|plugins\/plugin-[a-z-]+\/src\/components\//;
const TEXT_EXEMPT = new Map([
  // Licence attribution for an adapted upstream waveform; provenance only.
  ['apps/app/src/prototype/voice-activity.tsx', 'licence attribution'],
  // Runs upstream's own sign-in suite against upstream sources as test input.
  ['test/google-browser-auth.test.mjs', 'upstream suite input'],
  // Synthetic resident-build fixture paths, not Alpha sources.
  ['test/resident-build-output.test.mjs', 'synthetic fixture'],
  // Asserts the prepared tree stages no upstream UI.
  ['test/client-feature-preparation.test.mjs', 'negative assertion'],
  ['test/ui-self-contained.test.mjs', 'this guard'],
]);
test('no source, script, spec or test refers to upstream UI', () => {
  const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', 'apps', 'scripts', 'specs', 'test',
    'vite.config.ts', 'tsconfig.json', 'playwright.config.ts', 'capacitor.config.ts', 'lemmascript.json', 'LemmaScript-files.txt'], {encoding: 'utf8'})
    .split('\0').filter(file => file && !file.startsWith('specs/quint/.wave/') && fs.existsSync(file) && fs.statSync(file).isFile());
  assert.ok(files.length > 500, 'scanned the repository');
  const offenders = files.filter(file => !TEXT_EXEMPT.has(file) && UPSTREAM_UI_TEXT.test(fs.readFileSync(file, 'latin1')));
  assert.deepEqual(offenders, []);
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

test('resolver aliases name no upstream UI source', () => {
  const vite = fs.readFileSync('vite.config.ts', 'utf8');
  const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  assert.doesNotMatch(vite, /packages\/ui\//);
  assert.deepEqual([...vite.matchAll(/"(@elizaos\/ui[^"]*)":\s*fileURLToPath\(new URL\("\.\/([^"]+)"/g)].map(m => [m[1], m[2]]), [['@elizaos/ui/api/transport', TRANSPORT]]);
  const paths = tsconfig.compilerOptions.paths;
  assert.deepEqual(Object.keys(paths).filter(key => key.startsWith('@elizaos/ui')), ['@elizaos/ui/api/transport']);
  assert.deepEqual(paths['@elizaos/ui/api/transport'], ['./' + TRANSPORT]);
  assert.equal(tsconfig.include.some(entry => /packages\/ui/.test(entry)), false);
});
