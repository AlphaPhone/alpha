# specs/quint/application/FindInPage.qnt
- Lines: 121 | Kind: Quint model (live: listed in specs/quint/application/manifest.json, loaded by scripts/quint-lib.ts / check-quint.ts) | Verdict: KEEP model; PORT harness
- Covers: Find in page: debounced native search tied to the shown tab; native side clears search on navigation/hide. Duplicates: Browser Playwright journeys (find bar). Callers/importers: `specs/quint/refinement/application/find-in-page.mjs`, `test/quint-find-in-page.test.mjs` (not in index); 10 symbol pins in browser-adapter.ts.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 17,26 | T2/T10 | Imports upstream `BrowserTabSession` (good) but reads `browser-adapter.ts` and slices the find-bar functions, strips types, runs in `vm`. | Extract the find bar to `browser/find-in-page.ts` (exports openFind/closeFind/findQuery/…) and import it. | Low. |
| 2 | manifest symbols | T10 | 10 pins. | Delete. | None. |

## Proposed end state
Model unchanged; harness imports the extracted find-bar module.
