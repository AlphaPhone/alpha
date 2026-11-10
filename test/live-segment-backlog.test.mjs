import test from 'node:test';
import assert from 'node:assert/strict';

// The compatibility capture path posts each accepted batch to the agent's live ASR route one at a
// time (apps/app/src/runtime/live-segment-stream.ts). A route that stops answering must not queue
// audio without bound.
const {createLiveSegmentStream, LIVE_SEGMENT_BACKLOG_LIMIT} = await import('../apps/app/src/runtime/live-segment-stream.ts');
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const frame = timestamp => ({pcm16: 'AAAA', sampleRate: 16000, channels: 1, samples: 2, timestamp});

test('a stalled route fails the stream once the backlog limit is reached, with one result per closed segment', async () => {
  const posts = [], signals = [];
  const transport = {post: (body, signal) => { posts.push(body); signals.push(signal); return new Promise(() => {}); }};
  const segments = [], fatal = [];
  const stream = createLiveSegmentStream({transport, onSegment: text => segments.push(text), onFatal: code => fatal.push(code)});
  void stream.accept([frame(1)], [{type: 'speech-start', timestampMs: 1}]);
  void stream.accept([frame(2)], [{type: 'speech-end', timestampMs: 2}]);
  void stream.accept([frame(3)], [{type: 'speech-start', timestampMs: 3}]);
  for (let index = 3; index < LIVE_SEGMENT_BACKLOG_LIMIT; index++) void stream.accept([frame(index + 1)], []);
  await flush();
  assert.deepEqual(fatal, [], 'a backlog at the limit is still accepted');
  assert.equal(posts.length, 1, 'posts run one at a time');
  void stream.accept([frame(9000)], []);
  await flush();
  assert.deepEqual(fatal, ['TRANSPORT']);
  assert.deepEqual(segments, [null], 'the closed segment gets its one result');
  assert.equal(signals[0].aborted, true, 'the stalled request is released');
  assert.equal(stream.speaking(), false);
  void stream.accept([frame(9001)], [{type: 'speech-start', timestampMs: 9001}]);
  await stream.close();
  assert.deepEqual(fatal, ['TRANSPORT'], 'reported once');
  assert.deepEqual(segments, [null]);
  assert.equal(posts.length, 1, 'nothing more is forwarded');
});

test('a route that keeps answering never reaches the backlog limit', async () => {
  let count = 0;
  const transport = {post: async () => { count++; return {ok: true, mode: 'stream', framesReceived: 1}; }};
  const fatal = [];
  const stream = createLiveSegmentStream({transport, onSegment: () => {}, onFatal: code => fatal.push(code)});
  for (let index = 0; index < LIVE_SEGMENT_BACKLOG_LIMIT * 3; index++) await stream.accept([frame(index + 1)], []);
  assert.deepEqual(fatal, []);
  assert.equal(count, LIVE_SEGMENT_BACKLOG_LIMIT * 3);
});
