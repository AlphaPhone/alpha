import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from './support/strip-types.mjs';

const load = async path => import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(readFileSync(path, 'utf8'))).toString('base64'));
const {classifyAddress, MAX_ADDRESS_LENGTH} = await load('apps/app/src/browser/address-input.ts');
const searchFor = query => { const url = new URL('https://www.google.com/search'); url.searchParams.set('q', query); return {kind: 'search', href: url.href, query}; };

test('search operators and words ending in a colon are searched, not refused', () => {
  for (const query of ['site:example.com cats', 'define:x', 'Re: hello', 'python: lists', 'site:example.com', 'mailto:someone@example.com', 'tel:+15550100'])
    assert.deepEqual(classifyAddress(query), searchFor(query), query);
});

test('an email address and bare numbers are searched', () => {
  for (const query of ['user@example.com', 'user:secret@example.com', '3.14', '1.2.3', '2026.11', '1.2.3.999', '10.5/2'])
    assert.deepEqual(classifyAddress(query), searchFor(query), query);
});

test('hosts open over HTTPS and explicit HTTP(S) addresses are kept', () => {
  const cases = {
    'example.com': 'https://example.com/',
    ' example.com/a?b=1#c ': 'https://example.com/a?b=1#c',
    'example.com:8080/path': 'https://example.com:8080/path',
    'localhost': 'https://localhost/',
    'localhost:3000': 'https://localhost:3000/',
    '[::1]:8080/x': 'https://[::1]:8080/x',
    '192.168.1.1': 'https://192.168.1.1/',
    '192.168.1.1:8080': 'https://192.168.1.1:8080/',
    'http://example.com/a': 'http://example.com/a',
    'HTTPS://Example.com': 'https://example.com/',
    'node.js': 'https://node.js/',
  };
  for (const [input, href] of Object.entries(cases)) assert.deepEqual(classifyAddress(input), {kind: 'url', href}, input);
});

test('an explicit address that is invalid or carries credentials is refused, not sent to search', () => {
  for (const input of ['https://user:secret@example.com/', 'http://user@example.com', 'https://', 'http://exa[mple.com'])
    assert.deepEqual(classifyAddress(input), {kind: 'reject'}, input);
});

test('empty, over-long, control-character and non-string input is refused', () => {
  for (const input of ['', '   ', 'a\u0000b', 'cats\u007f', 'x'.repeat(MAX_ADDRESS_LENGTH + 1), undefined, null, 42, {}])
    assert.deepEqual(classifyAddress(input), {kind: 'reject'});
  assert.equal(classifyAddress('x'.repeat(MAX_ADDRESS_LENGTH)).kind, 'search');
});

test('no other scheme is ever opened', () => {
  for (const input of ['javascript:alert(1)', 'javascript:alert(1.5)', 'file:///etc/passwd', 'data:text/html,<b>x</b>', 'ftp://example.com/file', 'intent://scan/#Intent;end', 'about:blank', 'http:example.com', 'chrome://settings']) {
    const result = classifyAddress(input);
    assert.equal(result.kind, 'search', input);
    assert.ok(result.href.startsWith('https://www.google.com/search?q='), input);
  }
});

test('the classifier is total: one outcome for any text, whitespace is never an address, results are HTTP(S) without credentials', () => {
  const pieces = ['a', 'example.com', ':', '//', 'http', 'https', '@', ' ', '\t', '.', '1', '/', '?', '#', '[', ']', '%', 'é', ' ', 'x:y', '\n', 'localhost', '8080', '\\'];
  let seed = 20261109;
  const next = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let round = 0; round < 4000; round++) {
    let input = '';
    for (let count = 1 + Math.floor(next() * 6); count > 0; count--) input += pieces[Math.floor(next() * pieces.length)];
    const result = classifyAddress(input);
    assert.ok(['url', 'search', 'reject'].includes(result.kind), input);
    if (result.kind === 'reject') { assert.equal(result.href, undefined); continue; }
    const url = new URL(result.href);
    assert.ok(['https:', 'http:'].includes(url.protocol) && url.hostname && !url.username && !url.password, input);
    if (result.kind === 'search') { assert.equal(url.origin + url.pathname, 'https://www.google.com/search'); assert.equal(url.searchParams.get('q'), input.trim()); }
    else assert.ok(!/\s/.test(input.trim()), JSON.stringify(input));
  }
});
