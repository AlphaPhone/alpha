# test/browser/helpers/settled.ts
- Lines: 41 | Kind: Playwright wait helper (fonts ready, short animations finished, N frames) | Verdict: **KEEP** (move to `harness/time.ts`)
- Covers: replaces fixed sleeps before geometry checks; `frames()` waits through the screen-focus retry window. Duplicates: none; the research recommends it over `waitForTimeout` (P10). Callers/importers: 10 files (`accessibility-lifecycle`, `accessibility-resilience`, `accessibility-states.ts`, `accessibility-sweep(.production)`, `drawer-full-height`, `managed-maps-unavailable.production`, `one-calendar`, `shaw-ui-fixtures`, `view-focus`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 23 | B1 | Animation cancellation swallowed (`()=>undefined`); correct here (a cancelled animation is settled). | Keep, with the reason in a comment. | none |
| 2 | 10, 24 | T8 | Wall-clock `setTimeout` limit inside the page; under `page.clock.install()` it would be frozen. | Document "do not use with installed clock", or use `performance.now` polling. | Low. |

## Proposed end state
Moves unchanged to `harness/time.ts`; used by journeys before layout and a11y checks.
