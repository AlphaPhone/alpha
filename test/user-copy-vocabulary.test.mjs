import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';

// Literal copy the owner reads must not describe how the app works. The terms are the vocabulary
// half of the failure-toast filter in runtime/error-notice.ts (its other half is code and platform
// words, which this check does not need), plus "inference".
const root = resolve(import.meta.dirname, '..');
const TERMS = ['receipt', 'receipts', 'reconcil', 'admission', 'admitted', 'revision', 'revisions', 'resident', 'canonical'];
const VOCABULARY = new RegExp(`\\b(?:${TERMS.map(term => term === 'reconcil' ? 'reconcil\\w*' : term).join('|')}|inference)\\b`, 'i');

const files = (directory, extensions) => readdirSync(join(root, directory), {recursive: true, withFileTypes: true})
  .filter(entry => entry.isFile() && extensions.some(extension => entry.name.endsWith(extension)))
  .map(entry => join(entry.parentPath, entry.name));

// Literals only: bound values such as {{...}} or ${...} are left to the code that produces them.
const PATTERNS = [
  ['aria-label', /aria-label=(?:"([^"{]*)"|'([^'{]*)')/g],
  ['title or placeholder', /\b(?:title|placeholder|aria-description)="([^"{]*)"/g],
  ['toast', /toast\(\s*(?:'([^'\n]*)'|"([^"\n]*)")\s*[,)]/g],
  ['settings row', /\binfo\(\s*'([^'\n]*)'/g],
];
const JAVA = [['notification', /\.set(?:ContentTitle|ContentText|SubText|Ticker)\("([^"]*)"\)/g]];

function findings(path, patterns, text = readFileSync(path, 'utf8')) {
  const found = [];
  for (const [kind, pattern] of patterns) for (const match of text.matchAll(pattern)) {
    const copy = match.slice(1).find(group => group !== undefined) ?? '';
    if (VOCABULARY.test(copy)) found.push(`${relative(root, path)} ${kind}: ${copy}`);
  }
  return found;
}

test('the vocabulary stays within the failure-toast filter', () => {
  const source = readFileSync(join(root, 'apps/app/src/runtime/error-notice.ts'), 'utf8');
  const internal = source.match(/const INTERNAL = \/(.+)\/i;/)?.[1];
  assert.ok(internal, 'error-notice.ts defines INTERNAL');
  for (const term of TERMS) assert.ok(internal.includes(term), `INTERNAL lists ${term}`);
});

test('renderer labels, toasts and settings rows use owner language', () => {
  const found = files('apps/app/src', ['.ts', '.tsx', '.js', '.html']).flatMap(path => findings(path, PATTERNS));
  const template = join(root, 'apps/app/src/prototype/template.html');
  const markup = readFileSync(template, 'utf8').replace(/<(style|script)\b[\s\S]*?<\/\1>/g, '');
  for (const match of markup.matchAll(/>([^<>{}]+)</g)) if (VOCABULARY.test(match[1])) found.push(`${relative(root, template)} text: ${match[1].trim()}`);
  assert.deepEqual(found, []);
});

test('Android notification copy uses owner language', () => {
  assert.deepEqual(files('android/app/src/main/java', ['.java']).flatMap(path => findings(path, JAVA)), []);
});

test('the check catches the wording it exists for', () => {
  const sample = '<button aria-label="Check saved receipt"></button>api.toast(\'Deletion cancelled before admission.\');info(\'Inference model\', x);';
  assert.equal(findings(join(root, 'sample.ts'), PATTERNS, sample).length, 3);
  assert.equal(findings(join(root, 'Sample.java'), JAVA, 'b.setContentTitle("Gmail changes are being reconciled")').length, 1);
  assert.equal(findings(join(root, 'sample.ts'), PATTERNS, '<button aria-label="Check if it saved"></button>').length, 0);
});
