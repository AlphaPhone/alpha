// Source-level product identity and storage namespace (AP-01). This reads committed source only;
// built-APK identity is checked by scripts/apk.ts and is separate evidence.
import {ALPHA_PRODUCT_REGISTRATION as record} from '../apps/app/src/product/alpha-product-registration.ts';
import test from 'node:test';
import {androidIdentity} from '../scripts/android-identity.ts';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {tsImport} from './support/ts-import.mjs';
import ts from 'typescript-ast';

import {hostIdentity, readHostDescriptor} from '../scripts/android-host.ts';

const identity = JSON.parse(fs.readFileSync('app.config.json', 'utf8'));

function sources(dir, out = []) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) sources(file, out);
    else if (/\.(?:ts|tsx|js|mjs)$/.test(entry.name) && !/\.test\.[^.]+$/.test(entry.name)) out.push(file);
  }
  return out;
}

const STORAGE_METHODS = new Set(['getItem', 'setItem', 'removeItem']);
const PREFIXES = ['alpha.', 'alphaphone:'];
const FOREIGN = /milady|eliza:|senior/i;

/** Literal localStorage keys under a source tree: direct string arguments and the string constants passed by name. */
function literalStorageKeys(root) {
  const files = sources(root);
  const program = ts.createProgram(files, {allowJs: true, jsx: ts.JsxEmit.Preserve, noLib: true, noResolve: true, types: []});
  const checker = program.getTypeChecker();
  const keys = [];
  function prefix(expression, visited = new Set()) {
    if (!expression || visited.has(expression)) return;
    visited.add(expression);
    if (ts.isStringLiteralLike(expression) || ts.isTemplateExpression(expression)) {
      const key = ts.isStringLiteralLike(expression) ? expression.text : expression.head.text;
      return {file: expression.getSourceFile().fileName, key};
    }
    if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.PlusToken)
      return prefix(expression.left, visited);
    if (ts.isIdentifier(expression)) {
      let symbol = checker.getSymbolAtLocation(expression);
      if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
      const declaration = symbol?.valueDeclaration;
      if (declaration && ts.isVariableDeclaration(declaration)) return prefix(declaration.initializer, visited);
    }
  }
  for (const file of files) {
    function visit(node) {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
          && STORAGE_METHODS.has(node.expression.name.text)) {
        const key = prefix(node.arguments[0]);
        if (key) keys.push(key);
      }
      ts.forEachChild(node, visit);
    }
    visit(program.getSourceFile(file));
  }
  return keys;
}

test('app.config.json carries the Alpha Compute package identity', () => {
  assert.equal(identity.appId, 'ai.alphacompute.alphaphone');
  assert.equal(identity.appName, 'Alpha Phone');
});

test('the Android build derives namespace, applicationId and app_name from the selected declared identity', () => {
  // scripts/android-host.ts hands app.config.json to the generator; the descriptor carries no identity.
  const selected = androidIdentity('.');
  assert.deepEqual(hostIdentity('.'), {appId: selected.appId, appName: selected.appName, version: selected.version, versionCode: selected.versionCode});
  const {profile} = readHostDescriptor('.');
  assert.doesNotMatch(JSON.stringify(profile), /applicationId|appName|"identity"/);
});

test('every literal localStorage key under apps/app/src uses an Alpha prefix', () => {
  const keys = literalStorageKeys('apps/app/src');
  assert.ok(keys.length >= 20, `found only ${keys.length} keys; the scan no longer sees the storage calls`);
  for (const {file, key} of keys) {
    // Preserve the original durable Alpha onboarding key; renaming would lose completed installs.
    const historicalSetup = file === 'apps/app/src/startup-permission-progress.ts' && key === 'alpha:startup-permission-walkthrough:v1'
      || file === 'apps/app/src/startup-permissions.tsx' && ['alpha:startup-permission-progress:v1','alpha:startup-permissions-dismissed:v1'].includes(key);
    assert.ok(historicalSetup || PREFIXES.some(prefix => key.startsWith(prefix)), `${file}: ${JSON.stringify(key)} lacks an alpha. or alphaphone: prefix`);
    assert.doesNotMatch(key, FOREIGN, `${file}: ${JSON.stringify(key)} uses another product's prefix`);
  }
});

test('the key scan would catch an unprefixed or foreign key', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alpha-identity-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  fs.writeFileSync(path.join(dir, 'a.ts'), "const k='milady.theme';localStorage.getItem(k);localStorage.setItem('eliza:x','1');localStorage.getItem(`alpha.dev.${n}`);");
  assert.deepEqual(literalStorageKeys(dir).map(row => row.key).sort(), ['alpha.dev.', 'eliza:x', 'milady.theme']);
});

// Alpha is the registered product of its own mobile shell (apps/app/src/product/alpha-product-registration.ts). The
// record is the product's identity, theme and installed-data compatibility input; the checks below
// keep it equal to what the build and the renderer actually use.
test('the product record validates and carries the same identity as app.config.json', async () => {
  const {validateMobileProductRegistration} = await tsImport('../apps/app/src/ui/mobile-shell/product-registration.ts', import.meta.url);
  assert.deepEqual(validateMobileProductRegistration(record), []);
  assert.equal(record.identity.appId, identity.appId);
  assert.equal(record.identity.appName, identity.appName);
  // Installed-data compatibility: the favorites record, its product-view prefix and the
  // default-favorites policy every existing install wrote.
  assert.equal(record.storage.launcherFavorites, 'alpha.launcher.favorites.v1');
  assert.equal(record.storage.launcherBuiltinPrefix, 'alpha:');
  assert.equal(record.storage.launcherDefaultPolicy, 'alpha-apps');
  assert.doesNotMatch(JSON.stringify(record.storage), FOREIGN);
});

test('the product theme sets the Alpha accent in both appearances', async () => {
  const {alphaThemeVariables} = await tsImport('../apps/app/src/product/alpha-product.ts', import.meta.url);
  assert.equal(alphaThemeVariables('light')['--acct'], '#0000FF');
  assert.equal(alphaThemeVariables('dark')['--acct'], '#8A93FF');
});

test('Notes Done is accent text on the link token, legible on both backgrounds', async () => {
  const {alphaThemeVariables} = await tsImport('../apps/app/src/product/alpha-product.ts', import.meta.url);
  // --acc is the fill accent: pure blue text on the black editor is 2.44:1.
  const done = fs.readFileSync('apps/app/src/prototype/template.html', 'utf8').match(/<button[^>]*data-agent-id="notes-done"[^>]*>/)?.[0];
  assert.ok(done, 'Notes Done button');
  assert.match(done, /color:var\(--acct\)/);
  assert.doesNotMatch(done, /var\(--acc\)/);
  const luminance = hex => hex.slice(1).match(/../g).map(part => {const c = parseInt(part, 16) / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;}).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  for (const appearance of ['light', 'dark']) {
    const theme = alphaThemeVariables(appearance), [hi, lo] = [luminance(theme['--acct']), luminance(theme['--bg'])].sort((a, b) => b - a);
    assert.ok((hi + 0.05) / (lo + 0.05) >= 4.5, `${appearance} Done contrast`);
  }
});
