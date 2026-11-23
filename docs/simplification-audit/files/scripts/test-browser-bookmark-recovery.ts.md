# scripts/test-browser-bookmark-recovery.ts
- Lines: 67 | Kind: Playwright journey run as a child process (launches its own Chromium against the dev server, hand-written Capacitor bridge fake) | Verdict: REWRITE as a case in `test/browser/journeys/browser.spec.ts`
- Covers: Browser bookmarks: a failed first native read retries on Browser entry, a failed resume read keeps rows, two removals serialize, and a bookmark added natively meanwhile survives. Duplicates: `test/browser-bookmark-startup.test.mjs`, `test/quint-bookmarks-hydration.test.mjs` (model replay). Callers/importers: `test/browser/adapters.spec.ts` (spawns it inside a Playwright test, chromium project).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24, adapters.spec | T9 | A Playwright test spawns Node which launches a second Chromium: double browser, stderr-blob failures, no trace. | Write it as a normal spec using the `page` fixture. | L |
| 2 | 27-48 | T7 | Hand-written `window.Capacitor` PluginHeaders/nativePromise fake (one of ~57). | Use the shared typed bridge fixture (`test.extend` harness) with an `AlphaBrowser` handler. | L |
| 3 | 22-23 | B3 | `ALPHA_CONTEXT_TEST_URL` default port 5194 and hostname guard; Playwright `baseURL` replaces both. | Delete. | L |
| 4 | 49-65 | T6 | Clicks real UI (good) but asserts on fixture counters via `page.evaluate`; acceptable as boundary observation. | Keep counters through the harness API. | L |

## Proposed end state
One `test('bookmarks recover from failed reads and serialize removals')` in `journeys/browser.spec.ts` (chromium project) with the four assertions above; script and its `adapters.spec.ts` entry deleted.
