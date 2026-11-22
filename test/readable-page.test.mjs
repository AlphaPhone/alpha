// The page text rules (apps/app/src/browser/readable-page.ts) on fixture pages, and the same
// fixtures through the script Android's AlphaPageText runs in a tab's isolated reading world, so
// the web and Android readers cannot drift apart. jsdom has no layout, so the script's
// visibility check passes every element here; BrowserPageTextInstrumentedTest covers it on a device
// (CSS-hidden and scroll-reveal content, and a sign-in field in a CSS-hidden drawer).
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync, readdirSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {readablePage, readablePlainText} from '../apps/app/src/browser/readable-page.ts';
import {PAGE_TEXT_MAX_CHARS} from '../apps/app/src/browser/page-context.ts';

const fixtures = new URL('./fixtures/readable-page/', import.meta.url);
const html = name => readFileSync(new URL(name, fixtures), 'utf8');
const renderer = (name, max = PAGE_TEXT_MAX_CHARS) => readablePage(new JSDOM(html(name)).window.document, max);

// The text block Java compiles into AlphaPageText.SCRIPT; its only escapes are doubled backslashes.
const java = readFileSync(new URL('../android/app/src/main/java/ai/alphacompute/alphaphone/browser/AlphaPageText.java', import.meta.url), 'utf8');
const block = /static final String SCRIPT = """\n([\s\S]*?)""";/.exec(java);
const SCRIPT = block?.[1].replace(/\\(.)/g, (_, character) => character === 'n' ? '\n' : character);
const androidSource = (source, max = PAGE_TEXT_MAX_CHARS, contentType) => {
  const window = new JSDOM(source, {runScripts: 'outside-only'}).window;
  // jsdom parses HTML only; a WebView reports other documents' types the same way.
  if (contentType) Object.defineProperty(window.document, 'contentType', {value: contentType});
  return JSON.parse(JSON.stringify(window.eval(`(${SCRIPT})(${max})`)));
};
const android = (name, max) => androidSource(html(name), max);

test('a marketing home page reads its main content first and drops navigation, menus and hidden text', () => {
  const page = renderer('alphacompute-home.html');
  assert.equal(page.title, 'Alpha Compute | Sovereign Intelligence');
  assert.equal(page.description, 'End-to-end SI factory sourcing, GPU allocation, financing and rapid deployment.');
  const lines = page.text.split('\n');
  assert.deepEqual(lines.slice(0, 2), ['Sovereign Intelligence Built from the Ground Up',
    'Alpha Compute empowers enterprise and government to focus on product and innovation while we manage end-to-end SI factory sourcing, GPU allocation, financing, and rapid deployment.']);
  for (const hidden of ['Infrastructure', 'Energy-02', 'Sign in', 'Careers', 'Menu', 'Hidden promotional', 'Chart label', 'analytics', 'color:white'])
    assert.ok(!page.text.includes(hidden), hidden);
  assert.ok(page.text.includes('Decorative caption'), 'aria-hidden is page content');
  assert.equal(lines.filter(line => line.startsWith('We partner with')).length, 1, 'consecutive duplicate lines are dropped');
  assert.ok(lines.includes('We partner with energy providers, data center operators and silicon vendors.'), 'whitespace collapses');
  assert.ok(page.text.includes('Founded 2021, order 12345678.'), 'the rest of the body follows the main content');
  assert.equal(page.truncated, undefined);
});

test('a page with a password or one-time-code field gives no text', () => {
  for (const name of ['login-form.html', 'one-time-code.html']) {
    const page = renderer(name);
    assert.equal(page.textUnavailable, 'sign-in form on this page', name);
    assert.equal(page.text, undefined, name);
  }
});

test('a sign-in field in a hidden part of the page does not withhold the text', () => {
  assert.deepEqual(renderer('hidden-sign-in.html'), {title: 'Trail report', text: 'Trail report\nThe ridge trail reopened on Monday.'});
});

test('a page behind an open dialog reads in full: dialog libraries set aria-hidden on everything else', () => {
  assert.deepEqual(renderer('dialog-open.html'), {title: 'Field notes', text: 'Field notes\nThe north meadow flooded twice this spring.\nWe use cookies to improve this site.'});
});

test('sign-in links, sign-in prose and long numbers are ordinary page text', () => {
  const page = renderer('sign-in-links.html');
  assert.equal(page.description, 'What changed in build 20261122.');
  assert.match(page.text, /^Release 20261122\nBuild 4815162 ships the new login screen and fixes order 87654321\./);
  assert.match(page.text, /one-time code from the app/);
  assert.match(page.text, /Sign in to sync your settings\.$/);
});

test('a body wrapped in a form still reads, without control values or labels of buttons', () => {
  assert.deepEqual(renderer('form-body.html'), {title: 'Old site', text: 'Garden Journal\nThe tomatoes ripened early this year.'});
});

test('long text stops at the limit on a word boundary', () => {
  const page = renderer('long-article.html', 300);
  assert.equal(page.truncated, true);
  assert.ok(page.text.length <= 300 && page.text.length > 240);
  assert.match(page.text, /word\d{4}$/);
});

test('Android reads every fixture exactly as the web reader does, at the same limit', () => {
  assert.ok(SCRIPT, 'AlphaPageText.SCRIPT was found');
  assert.equal(Number(/public static final int MAX_CHARS = (\d+);/.exec(java)?.[1]), PAGE_TEXT_MAX_CHARS);
  for (const name of readdirSync(fixtures).filter(file => file.endsWith('.html')).sort())
    for (const max of [PAGE_TEXT_MAX_CHARS, 300]) assert.deepEqual(android(name, max), renderer(name, max), `${name} at ${max}`);
});

test('Android reads plain text pages line by line and refuses other document types', () => {
  // A WebView shows a text/plain document as one pre element.
  const plain = 'one\n\n  two  \ntwo\nthree';
  assert.deepEqual(androidSource(`<pre>${plain}</pre>`, 100, 'text/plain'), readablePlainText(plain, 100));
  assert.deepEqual(readablePlainText(plain, 100), {text: 'one\ntwo\nthree'});
  assert.deepEqual(androidSource(html('alphacompute-home.html'), 4000, 'application/xml'), {textUnavailable: 'not readable'});
});
