import assert from 'node:assert/strict';
import {checkTraces} from '../check-traces.mjs';
import {captureReplayClosure} from '../observed-replay.mjs';
import {browserAdapterHost} from '../application/browser-adapter-host.mjs';
import {action, deferred, sourceModule, until} from './support.mjs';

const instant = ['bookmarks', 'browsingState', 'saveBrowsingState', 'present', 'close', 'cancelReading', 'addListener', 'readingSupport', 'create', 'navigate'];
const url = 'https://example.test/article';

export async function readingRefinement() {
  const capability = '.eliza/client-features/plugins/plugin-native-browser-surface/src/page-reading.ts';
  const sources = [capability, 'apps/app/src/prototype/browser-adapter.ts',
    'specs/quint/refinement/application/browser-adapter-host.mjs', 'specs/quint/refinement/services/reading.mjs'];
  const driverHashes = captureReplayClosure(sources);
  const {createReadingSupport} = await sourceModule(capability);
  const traces = [];
  {
    const gate = deferred(); let queries = 0;
    const probe = createReadingSupport(() => { queries++; return gate.promise; });
    const first = probe.check(), second = probe.check(); assert.equal(first, second);
    gate.resolve({available: false}); await first;
    traces.push({name: 'unsupported native capability deduplicates concurrent probes', expect: {'s.speech': false}, steps: [{label: 'real explicit unavailable capability refuses isolated reading', action: action('unsupported'), expect: {'s.isolated': probe.state === 'available'}}]});
    assert.equal(queries, 1);
  }
  // Native Read aloud through the installed adapter: the native review issues the token and the
  // reading voice consumes it, unless the page changed while the review was open.
  for (const outcome of ['spoken', 'navigated']) {
    const host = await browserAdapterHost({instant});
    try {
      const open = async (address, sequence) => {
        host.rendered().onAddrKey({key: 'Enter', preventDefault() {}, target: {value: address}}); await host.sync();
        host.emit('stateChanged', {id: host.state().cur, sequence, navigation: 'navigation-' + sequence,
          url: address, title: 'Article', error: '', loading: false, committed: true});
        await host.sync();
      };
      await open(url, 1);
      const spoken = [];
      host.host.voice = () => ({binding: {execution: 'device', ownerId: 'owner', sessionId: 'session', expiresAt: Date.now() + 60000},
        isCurrent: () => true, ready: async () => true, speak: async token => { spoken.push(token); }});
      host.rendered().readAloud();
      await until(() => host.waiting('reviewReading') === 1, 'the native reading review');
      const trace = {name: `Browser Read aloud ${outcome}`, expect: {'s.speech': spoken.length > 0}, steps: [{
        label: 'Read aloud asks the native isolated review of the current page', action: [action('worldHandshake', true), action('request'), action('extracted', false)], expect: {'s.token': false},
      }]};
      if (outcome === 'navigated') {
        await open('https://example.test/changed', 2);
        assert.ok(host.calls.some(call => call.name === 'cancelReading'));
        await host.settleCall('reviewReading', {value: {readingToken: 'token-1'}});
        assert.deepEqual(spoken, []);
        trace.steps.push({label: 'a review the page outlived is never spoken', action: [action('approve'), action('navigation')], expect: {'s.token': false, 's.speech': spoken.length > 0}});
      } else {
        await host.settleCall('reviewReading', {value: {readingToken: 'token-1'}});
        await until(() => spoken.length === 1, 'the reading voice');
        assert.deepEqual(spoken, ['token-1']);
        trace.steps.push({label: 'the approved excerpt is spoken once', action: [action('approve'), action('consume')], expect: {'s.token': false, 's.speech': spoken.length > 0}});
      }
      traces.push(trace);
    } finally {await host.teardown();}
  }
  return checkTraces({model: 'BrowserReadingState', sources, driverHashes, traces, scope: 'bounded-component',
    assumptions: ['Real capability probing and the Browser adapter execute, including the tab lifetime fence. The native review, WebView and reading voice are controlled ports.', 'The native isolated extraction and the token consumption by speech are native and not exercised here.']});
}
