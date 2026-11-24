// spec/shell/landing.md, "Story: Come back to Alpha after authorizing a connection": the static Cloud delegation return
// page (apps/app/public/delegation-return.html) the browser lands on after a provider's consent page. It replaces the
// removed scripts/test-cloud-delegation-return.ts. The page's own checks of the return are the landing's, in the app
// (src/shell/landing.vibe, test/shell); this covers the forwarder in front of it. Evidence class: source and Node only,
// not a browser, an APK or a device.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const html = readFileSync(path.join(root, 'apps/app/public/delegation-return.html'), 'utf8');
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];

/** The page's Content-Security-Policy as directive → sources. */
function policy() {
  const metas = [...html.matchAll(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/g)];
  assert.equal(metas.length, 1, 'one policy');
  return new Map(metas[0][1].split(';').map(part => part.trim().split(/\s+/)).map(([name, ...sources]) => [name, sources]));
}

/** Runs the page's script at `href`; what it did to the address and where it sent the browser. */
function forward(href) {
  const url = new URL(href);
  const effects = [];
  const location = {
    get search() { return url.search; }, get pathname() { return url.pathname; }, get href() { return url.href; },
    replace: target => effects.push(['replace', target]),
  };
  const history = {replaceState: (_state, _title, target) => { effects.push(['replaceState', target]); url.href = new URL(target, url).href; }};
  vm.runInNewContext(scripts[0][2], {location, history, URL});
  return effects;
}

test('the return page runs only its one hashed script, sends no referrer and loads nothing else', () => {
  assert.equal(scripts.length, 1, 'one inline script');
  assert.equal(scripts[0][1].trim(), '', 'the script is inline, with no src');
  const csp = policy();
  const hash = `'sha256-${createHash('sha256').update(scripts[0][2], 'utf8').digest('base64')}'`;
  assert.deepEqual(csp.get('script-src'), [hash], 'script-src names exactly the page script');
  assert.deepEqual(csp.get('default-src'), ["'none'"]);
  assert.deepEqual(csp.get('base-uri'), ["'none'"]);
  assert.deepEqual(csp.get('form-action'), ["'none'"]);
  assert.match(html, /<meta name="referrer" content="no-referrer">/);
  assert.doesNotMatch(html, /<(?:link|img|iframe|form|object|embed)\b/i, 'nothing else is loaded or submitted');
});

test('the return page removes the query from its address before handing it, unread, to the landing fragment', () => {
  const state = 'A'.repeat(43);
  for (const query of [`?state=${state}&code=example`, `?state=${state}&error=access_denied&error_description=details`, '']) {
    const effects = forward(`https://phone.example/app/delegation-return.html${query}`);
    assert.deepEqual(effects, [
      ['replaceState', '/app/delegation-return.html'],
      ['replace', `https://phone.example/app/#delegation-return${query}`],
    ], query);
  }
});

test('the landing reads back exactly the query the return page handed over', async () => {
  const {landingQuery} = await import('../apps/app/src/shell/page.ts');
  const state = 'A'.repeat(43);
  const query = `?state=${state}&code=example`;
  const [, [, target]] = forward(`https://phone.example/delegation-return.html${query}`);
  const previous = globalThis.location;
  try {
    globalThis.location = new URL(target);
    assert.equal(landingQuery(), query);
  } finally { globalThis.location = previous; }
});

test('the exported browser proof ships the return page beside the app', () => {
  assert.match(readFileSync(path.join(root, 'scripts/ci/export-browser-proof.ts'), 'utf8'), /'delegation-return\.html'/);
});
