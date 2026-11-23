# scripts/test-maps-context-browser.ts
- Lines: 57 | Kind: Playwright script spawned from a Playwright spec (T9), with in-page module imports (T6) | Verdict: REWRITE as a case in `journeys/maps.spec.ts`
- Covers: the Maps selection context sent to the agent carries an opaque `maps_<uuid>` id, never coordinates, the renamed label or the search text; stale, forged and cross-view contexts are rejected; leaving Maps clears it. Duplicates: `test/browser/maps-approved-read.spec.ts` (map-place context reads) overlaps on opaque ids. Callers/importers: `test/browser/adapters.spec.ts:6` (spawns it via `execFile` with `ALPHA_MAPS_TEST_URL`); imports `scripts/fixtures/playwright.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T9 | A Playwright spec spawns a Node script that launches its own Chromium against the same Vite server. | Write it as a real `test()` using the `page` fixture. | None |
| 2 | 19-23, 39-42 | T6 | `page.evaluate(import('/src/runtime/phone-context.ts'))` calls `phoneContextMessage`/`sanitizePhoneContext` directly. | Assert on the wire: intercept the agent turn request (`page.route`) after asking "Help with this screen" and check its context. Drop the forged-context rejection checks (unit-level; Quint/phone-context harness covers them). | Low |
| 3 | 52 | T6 | Dispatches `launcher-home` event instead of pressing Home. | Use the Home gesture/button. | None |

Cases worth carrying: coordinates, renamed private label and private search text never in the outgoing context; selected object kind changes `map-place` -> `map-search`; Home clears `selectedObject`.

## Proposed end state
File deleted; ~30-line case in `journeys/maps.spec.ts` using the shared harness and request interception. Remove the entry from `adapters.spec.ts`.
