// spec/browser/pageContext.md, "Browser prepares one native capture of the open page ahead of a message"
import { assert, test, vi } from "vitest";
import { BrowserPageCache } from "../../src/browser/page-cache.ts";

const cap = (title = "Story") => ({ tabId: "host:tab", revision: "2", capturedAt: 20, url: "https://example.net/story", title });

test("one native capture serves overlapping refreshes for the same document", async () => {
  const cache = new BrowserPageCache();
  cache.select("first");
  let requests = 0;
  const read = async () => { requests += 1; return cap(); };
  assert.deepEqual(await Promise.all([cache.refresh("first", read), cache.refresh("first", read)]), [cap(), cap()]);
  assert.equal(requests, 1);
});

test("a retired document never republishes if the native listener returns after cancellation", async () => {
  const cache = new BrowserPageCache();
  cache.select("first");
  let release = () => {};
  let signal: AbortSignal | undefined;
  const retired = cache.refresh("first", (given) => new Promise((resolve) => {
    signal = given;
    release = () => resolve(cap("Retired"));
  }));
  await Promise.resolve();
  cache.select("second");
  assert.equal(signal?.aborted, true);
  await cache.refresh("second", async () => cap("Current"));
  release();
  assert.isUndefined(await retired);
  assert.equal(cache.cached("second", 21, 1)?.title, "Current");
  assert.isUndefined(cache.cached("first", 21, 1));
});

test("a capture loses eligibility on expiry, a clock reversal, or withdrawal", async () => {
  const cache = new BrowserPageCache();
  cache.select("first");
  await cache.refresh("first", async () => cap());
  assert.deepEqual(cache.cached("first", 600020, 600000), cap());
  assert.isUndefined(cache.cached("first", 600021, 600000));
  assert.isUndefined(cache.cached("first", 19, 600000));
  cache.select(undefined);
  assert.isUndefined(cache.cached("first", 20, 600000));
  assert.isUndefined(await cache.refresh("first", async () => cap()));
});

test("a departed page never starts a scheduled read", async () => {
  vi.useFakeTimers();
  try {
    const cache = new BrowserPageCache();
    const capture = vi.fn(async () => cap());
    cache.select("first");
    cache.schedule("first", 700, capture);
    await vi.advanceTimersByTimeAsync(699);
    assert.equal(capture.mock.calls.length, 0);
    cache.select("second");
    cache.schedule("second", 700, capture);
    await vi.advanceTimersByTimeAsync(700);
    assert.equal(capture.mock.calls.length, 1);
    assert.isUndefined(cache.cached("first", 21, 1));
    assert.deepEqual(cache.cached("second", 21, 1), cap());
  } finally {
    vi.useRealTimers();
  }
});
