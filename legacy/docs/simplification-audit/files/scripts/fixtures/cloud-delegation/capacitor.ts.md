# scripts/fixtures/cloud-delegation/capacitor.ts
- Lines: 24 | Kind: component-page fixture (Vite alias for `@capacitor/core` in the Cloud delegation test page) | Verdict: MOVE to `test/fixtures/component-pages/cloud-delegation/` with the rest of the page
- Covers: fakes the native delegation-callback plugin (read/clear callback, `addListener`) so the real `CloudDelegationPanel` can run in Chromium. Duplicates: none (the 57 hand-written Capacitor bridge fakes in Playwright specs, T7, play the same role elsewhere). Callers/importers: aliased in by `scripts/test-cloud-delegation.ts:17-22` (`@capacitor/core` -> this file); imports `./controls.ts`. That script is driven by `test/browser/adapters.spec.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-24 | T7 | One more bespoke Capacitor fake. `registerPlugin()` ignores the plugin name and returns the same object for every plugin. | Acceptable for a single-component page; when the shared typed `test.extend` harness lands, take its bridge fake instead. | L |
| 2 | file | T9 | Test fixture under `scripts/`. | Move with the page and its driver. | L |

## Proposed end state
Moves unchanged to `test/fixtures/component-pages/cloud-delegation/capacitor.ts`. The driver `scripts/test-cloud-delegation.ts` becomes a Playwright
spec (`journeys/connection-cloud.spec.ts`, "Cloud delegation panel" block) that builds this page through Vite and uses the Playwright test runner's
browser instead of launching its own Chromium.
