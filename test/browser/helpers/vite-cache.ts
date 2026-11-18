import {resolve} from 'node:path';

// A Vite dependency-optimizer cache that one server owns. Specs that start their own in-process
// Vite server give it a cache directory; two servers optimising into one directory replace each
// other's files mid-request ("Failed to fetch dynamically imported module", "Outdated Optimize Dep").
// Workers of one run share the worktree, and so do concurrent runs, which use different ports
// (ALPHA_BROWSER_TEST_PORT). Scoping by port and by the worker's parallel index gives every live
// server its own directory: Playwright never runs two workers with the same index at once, and a
// replacement worker reuses its predecessor's index, so the cache stays warm across workers and runs.
export function scopedViteCacheDir(directory: string): string {
  const port = process.env.ALPHA_BROWSER_TEST_PORT || '5317';
  const worker = process.env.TEST_PARALLEL_INDEX ?? `pid${process.pid}`;
  return `${resolve(directory)}-${port}-w${worker}`;
}
