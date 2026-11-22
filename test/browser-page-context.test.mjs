// The Browser page block every agent turn carries while a page applies (apps/app/src/browser/page-context.ts),
// first over a controlled tab host, then through the installed Browser adapter.
import assert from 'node:assert/strict';
import test from 'node:test';
import {PAGE_ABOUT, PAGE_GRACE_MS, PAGE_READ_BUDGET_MS, PAGE_TEXT_MAX_CHARS, capText, cleanPageUrl, createBrowserPageContext} from '../apps/app/src/browser/page-context.ts';
import {browserAdapterHost} from '../specs/quint/refinement/application/browser-adapter-host.mjs';

const browser = {view: 'browser', revision: 3, sensitive: false};
const page = (fields = {}) => ({tab: 'b1', navigation: '7', url: 'https://www.alphacompute.ai/', title: 'Alpha Compute', private: false, loading: false, readable: true, ...fields});
const HERO = 'Alpha Compute empowers enterprise and government to focus on product and innovation while we manage end-to-end SI factory sourcing, GPU allocation, financing, and rapid deployment.';

function fakeHost(options = {}) {
  const current = 'current' in options ? options.current : page();
  const read = options.read ?? (async () => ({url: current?.url, title: 'Alpha Compute | Sovereign Intelligence', text: HERO}));
  const host = {now: 1_000_000, page: current, reads: 0, waiting: [],
    current: () => host.page,
    read: async (...args) => { host.reads++; return read(...args); },
    changed: signal => new Promise(resolve => { host.waiting.push(resolve); signal.addEventListener('abort', resolve, {once: true}); }),
    change(next) { host.page = next; for (const resolve of host.waiting.splice(0)) resolve(); },
  };
  return {host, context: createBrowserPageContext({current: host.current, read: host.read, changed: host.changed, now: () => host.now})};
}
const turn = (context, view = browser, signal = new AbortController().signal) => context.forTurn(view, signal);

test('a page open in Browser rides the turn with its address, title and readable text', async () => {
  const {host, context} = fakeHost();
  assert.deepEqual(await turn(context), {v: 1, about: PAGE_ABOUT, onScreen: true, url: 'https://www.alphacompute.ai/', title: 'Alpha Compute | Sovereign Intelligence', text: HERO});
  assert.equal(host.reads, 1);
});

test('no message text reaches the page context, so every wording gets the same block', async () => {
  // The turn's context and signal are the only inputs: nothing routes on what was asked.
  const {context} = fakeHost();
  assert.equal(context.forTurn.length, 2);
  const blocks = [];
  for (const _prompt of ['Summarize the page I have open in one sentence.', 'What does this website tell Alpha compute?', 'Is this legit?',
    "What's the price here?", 'And who runs it?', 'Put Taco Night Grocery Run on my calendar tomorrow from noon to twelve thirty.'])
    blocks.push(JSON.stringify(await turn(context)));
  assert.equal(new Set(blocks).size, 1);
});

test('no block without a page, on a sensitive screen or in a private tab', async () => {
  for (const [name, setup] of [['no tab', {current: undefined}], ['private tab', {current: page({private: true})}], ['no address', {current: page({url: ''})}]]) {
    const {host, context} = fakeHost(setup);
    assert.equal(await turn(context), undefined, name);
    assert.equal(host.reads, 0, name);
  }
  const {host, context} = fakeHost();
  assert.equal(await turn(context, {...browser, sensitive: true}), undefined);
  assert.equal(await turn(context, {view: 'home', revision: 1, sensitive: false}), undefined, 'Browser was never left with a page');
  assert.equal(host.reads, 0);
});

test('the address keeps no user info, fragment or credential-like query value', () => {
  assert.equal(cleanPageUrl('https://user:pass@shop.example/item/9?id=42&session_id=abc&utm=x&Auth=1&next=%2Fa#reviews'),
    'https://shop.example/item/9?id=42&session_id=…&utm=x&Auth=…&next=%2Fa');
  assert.equal(cleanPageUrl('https://example.com/?code=xyz&q=tacos&api_key=k'), 'https://example.com/?code=…&q=tacos&api_key=…');
  assert.equal(cleanPageUrl('javascript:alert(1)'), '');
});

test('url, title, description and text are capped', async () => {
  const long = Array.from({length: 2000}, (_, index) => `word${index}`).join(' ');
  const {context} = fakeHost({current: page({url: 'https://example.com/' + 'a'.repeat(3000)}),
    read: async () => ({title: 'T'.repeat(500), description: 'D'.repeat(500), text: long})});
  const block = await turn(context);
  assert.equal(block.url.length, 2048);
  assert.equal(block.title.length, 200);
  assert.equal(block.description.length, 300);
  assert.ok(block.text.length <= PAGE_TEXT_MAX_CHARS && block.text.length > PAGE_TEXT_MAX_CHARS * 0.9);
  assert.match(block.text, /word\d+$/, 'cut at a word boundary');
  assert.equal(block.truncated, true);
  assert.ok(JSON.stringify(block).length < 7000, 'the whole block stays bounded');
  assert.deepEqual(capText('short text'), {text: 'short text', truncated: false});
});

test('after Browser is left the last block applies for two minutes, then never again', async () => {
  const {host, context} = fakeHost();
  const onScreen = await turn(context);
  context.left();
  host.now += 119_000;
  const home = {view: 'home', revision: 4, sensitive: false};
  assert.deepEqual(await turn(context, home), {...onScreen, onScreen: false, leftSecondsAgo: 119});
  assert.equal(host.reads, 1, 'no new read off screen');
  host.now += 2_000;
  assert.ok(host.now - 1_000_000 > PAGE_GRACE_MS);
  assert.equal(await turn(context, home), undefined);
});

test('the grace ends when the page changes, a private tab shows, the tab closes or data is cleared', async () => {
  const home = {view: 'home', revision: 4, sensitive: false};
  for (const [name, end] of [
    ['another page', (host) => { host.page = page({navigation: '8', url: 'https://example.com/'}); }],
    ['private tab', (host) => { host.page = page({tab: 'b2', private: true}); }],
    ['closed tab', (host) => { host.page = undefined; }],
    ['cleared data', (_host, context) => context.cleared()],
  ]) {
    const {host, context} = fakeHost();
    await turn(context); context.left(); host.now += 5_000;
    end(host, context);
    assert.equal(await turn(context, home), undefined, name);
  }
});

test('a page still loading is read once it commits within the budget', async () => {
  const {host, context} = fakeHost({current: page({loading: true})});
  const pending = turn(context);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(host.reads, 0);
  host.change(page());
  assert.equal((await pending).text, HERO);
  assert.equal(host.reads, 1);
});

test('a reader that is not ready yet is asked once more after the next tab change', async () => {
  let answers = [{textUnavailable: 'loading'}, {title: 'Alpha Compute', text: HERO}];
  const {host, context} = fakeHost({read: async () => answers.shift()});
  const pending = turn(context);
  await new Promise(resolve => setTimeout(resolve, 20));
  host.change(page());
  assert.equal((await pending).text, HERO);
  assert.equal(host.reads, 2);
});

test('a page that never commits is sent as loading, and a hung reader as still reading, within the budget', async () => {
  for (const [setup, reason] of [[{current: page({loading: true})}, 'loading'], [{read: () => new Promise(() => {})}, 'still reading']]) {
    const {context} = fakeHost(setup);
    const started = Date.now();
    const block = await turn(context);
    assert.equal(block.textUnavailable, reason);
    assert.equal(block.text, undefined);
    assert.ok(Date.now() - started < PAGE_READ_BUDGET_MS + 500, reason);
  }
});

test('a reader that fails or a page that cannot be read gives the block without text', async () => {
  for (const setup of [{read: async () => { throw new Error('Browser tab is unavailable'); }}, {current: page({readable: false})},
    {read: async () => ({textUnavailable: 'sign-in form on this page'})}]) {
    const {context} = fakeHost(setup);
    const block = await turn(context);
    assert.equal(block.url, 'https://www.alphacompute.ai/');
    assert.equal(block.text, undefined);
    assert.ok(['not readable', 'sign-in form on this page'].includes(block.textUnavailable));
  }
});

test('a cancelled turn gets no block and leaves nothing waiting', async () => {
  const {context} = fakeHost({read: () => new Promise(() => {})});
  const controller = new AbortController();
  const pending = turn(context, browser, controller.signal);
  controller.abort();
  const started = Date.now();
  assert.equal((await pending)?.text, undefined);
  assert.ok(Date.now() - started < 100);
});

// The installed Browser adapter registers the context with the connection controller.
const instant = ['bookmarks', 'browsingState', 'saveBrowsingState', 'present', 'close', 'cancelReading', 'addListener', 'readingSupport', 'create', 'navigate'];
async function openPage(host, address, sequence, fields = {}) {
  host.rendered().onAddrKey({key: 'Enter', preventDefault() {}, target: {value: address}}); await host.sync();
  host.emit('stateChanged', {id: host.state().cur, sequence, navigation: 'n' + sequence, url: address, title: 'Alpha Compute', error: '', loading: false, committed: true, ...fields});
  await host.sync();
}

test('the Browser adapter reads the current tab silently through the native pageText method', async () => {
  const host = await browserAdapterHost({instant});
  try {
    await openPage(host, 'https://www.alphacompute.ai/', 1);
    const pending = host.host.pageContext(browser, new AbortController().signal);
    await host.settle();
    const call = host.pending.find(item => item.name === 'pageText');
    assert.deepEqual(call.input, {session: host.session(), id: host.state().cur, maxChars: PAGE_TEXT_MAX_CHARS});
    await host.settleCall('pageText', {value: {url: 'https://www.alphacompute.ai/', title: 'Alpha Compute | Sovereign Intelligence', text: HERO}});
    const block = await pending;
    assert.equal(block.text, HERO);
    assert.equal(host.calls.filter(item => /^review/.test(item.name)).length, 0, 'no reading review or dialog');
    // Leaving Browser keeps the same page for the grace window.
    host.view.onLeave();
    const later = await host.host.pageContext({view: 'home', revision: 4, sensitive: false}, new AbortController().signal);
    assert.equal(later.onScreen, false);
    assert.equal(later.text, HERO);
  } finally { await host.teardown(); }
});

test('the Browser adapter never reads a private tab and waits for a loading page to commit', async () => {
  const host = await browserAdapterHost({instant});
  try {
    host.state().tabs = host.state().tabs.map(tab => ({...tab, priv: true}));
    await openPage(host, 'https://www.alphacompute.ai/', 1);
    assert.equal(await host.host.pageContext(browser, new AbortController().signal), undefined);
    assert.equal(host.waiting('pageText'), 0);
  } finally { await host.teardown(); }
  const loading = await browserAdapterHost({instant});
  try {
    loading.rendered().onAddrKey({key: 'Enter', preventDefault() {}, target: {value: 'https://www.alphacompute.ai/'}}); await loading.sync();
    const pending = loading.host.pageContext(browser, new AbortController().signal);
    await loading.settle();
    assert.equal(loading.waiting('pageText'), 0, 'nothing is read before the page commits');
    loading.emit('stateChanged', {id: loading.state().cur, sequence: 1, navigation: 'n1', url: 'https://www.alphacompute.ai/', title: 'Alpha Compute', error: '', loading: false, committed: true});
    await loading.settle();
    await loading.settleCall('pageText', {value: {url: 'https://www.alphacompute.ai/', title: 'Alpha Compute', text: HERO}});
    assert.equal((await pending).text, HERO);
  } finally { await loading.teardown(); }
});

test('the development page copy is fetched only from public HTTPS hosts, without following redirects elsewhere', async () => {
  const {fetchPublicPage, privateAddress, publicPageAddress} = await import('../scripts/browser-page-dev-proxy.ts');
  for (const address of ['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.9', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1'])
    assert.equal(privateAddress(address), true, address);
  assert.equal(privateAddress('93.184.216.34'), false);
  for (const url of ['http://93.184.216.34/', 'https://localhost/', 'https://printer.local/', 'https://app.localhost/', 'https://user:pw@93.184.216.34/', 'https://10.0.0.8/', 'ftp://93.184.216.34/'])
    assert.equal(await publicPageAddress(url), undefined, url);
  assert.equal((await publicPageAddress('https://93.184.216.34/a?b=1'))?.href, 'https://93.184.216.34/a?b=1');
  const answers = {
    'https://93.184.216.34/': new Response(null, {status: 302, headers: {location: 'https://93.184.216.35/page'}}),
    'https://93.184.216.35/page': new Response('<title>Hi</title>', {headers: {'content-type': 'text/html; charset=utf-8'}}),
    'https://93.184.216.36/': new Response(null, {status: 301, headers: {location: 'https://127.0.0.1/admin'}}),
    'https://93.184.216.37/': new Response('%PDF', {headers: {'content-type': 'application/pdf'}}),
  };
  const requests = [];
  const fetchImpl = async (url, init) => { requests.push({url: String(url), credentials: init.credentials, redirect: init.redirect}); return answers[String(url)]; };
  assert.deepEqual(await fetchPublicPage('https://93.184.216.34/', fetchImpl), {type: 'text/html', body: '<title>Hi</title>'});
  assert.deepEqual(requests.map(request => [request.credentials, request.redirect]), [['omit', 'manual'], ['omit', 'manual']]);
  assert.equal(await fetchPublicPage('https://93.184.216.36/', fetchImpl), undefined, 'a redirect to a private address is not followed');
  assert.equal(await fetchPublicPage('https://93.184.216.37/', fetchImpl), undefined, 'only HTML and plain text');
});
