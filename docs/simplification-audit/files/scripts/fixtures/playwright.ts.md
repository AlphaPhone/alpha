# scripts/fixtures/playwright.ts
- Lines: 29 | Kind: test support (resolve the `playwright` package from `ALPHA_BROWSER_MODULES` or the caller; ambient `Window` typings for the Android bridge fake) | Verdict: DELETE once the browser scripts become `@playwright/test` specs; until then MOVE to `test/support/`
- Covers: lets standalone `scripts/test-*-browser.ts` programs launch their own Chromium. Duplicates: `scripts/test-cloud-delegation.ts:15-16` inlines the same `createRequire(.../fixture.cjs)('playwright')` lookup. Callers/importers: `test-notes-documents-browser`, `test-cloud-delegation-return`, `test-agent-context-browser`, `test-hosted-live-source-picker`, `test-maps-context-browser`, `test-photo-filter-png-reference`, `test-browser-bookmark-recovery`, `test-inbox-drafts-browser`, `maps/test-renderer`, `maps/test-recovery-renderer`. `ALPHA_BROWSER_MODULES` is set by `test/browser/adapters.spec.ts` and read by `prototype-capture.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-29 | T9 | Exists because Playwright journeys are run as child programs (`test/browser/adapters.spec.ts` shells out to 8 scripts, each launching its own browser; research/tests-browser.md P16). | Fold the scripts into Playwright specs; the runner supplies `page`. Delete this file. | M |
| 2 | 4-24 | C1 | Ambient `Window.androidBridge` / `Window.Capacitor` declarations for three scripts (`test-notes-documents-browser`, `test-agent-context-browser`, `test-browser-bookmark-recovery`) that install a bridge fake by init script. | Move into the shared typed bridge fake of the Playwright harness (T7). | L |
| 3 | — | A7 | `maps/test-renderer.ts`, `maps/test-recovery-renderer.ts` and `test-photo-filter-png-reference.ts` have no caller in package.json, workflows or tests (a grep finds only a provenance string in `android/app/src/androidTest/assets/photo-filter-goldens.json` for the golden generator). | Report to the maps/photos chunk owners: these importers are manual tools or dead. | L |

## Proposed end state
No file. The adapter scripts become specs (`journeys/notes.spec.ts`, `journeys/browser.spec.ts`, `journeys/maps.spec.ts`,
`journeys/inbox.spec.ts`, `journeys/connection-cloud.spec.ts`) on the shared harness, and `ALPHA_BROWSER_MODULES` goes with
`adapters.spec.ts`. The photo-filter golden generator, if kept as a manual tool, resolves Playwright normally.
