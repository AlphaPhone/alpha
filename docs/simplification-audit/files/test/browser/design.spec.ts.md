# test/browser/design.spec.ts
- Lines: 34 | Kind: Playwright render smoke over `?mode=mock` states, chromium | Verdict: **MERGE** into the mock-state loop of `journeys/accessibility.spec.ts`
- Covers: every mock-mode state (10 apps' sub-states × light/dark, plus 8 shell states) renders the mock banner and a screen without page errors, console errors or the text "undefined"; the failed-workflow details show the revoked-access reason. Duplicates: `accessibility-sweep.spec.ts` and `accessibility-states.ts` load the same `?mode=mock&start=` targets; `confidentiality-claims.spec.ts` loads them again. Callers/importers: none. 22 tests (each loads up to 6 states).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-7 | C6 | Third copy of the mock start-target table (also `confidentiality-claims.spec.ts:4-11`, `accessibility-states.ts`). | One exported list in the harness. | none |
| 2 | 10, 26 | P13 | Hand-written `pageerror` + console-error collectors. | Harness auto-fixture fails on page errors. | none |
| 3 | 8-34 | T4 | The sweep already visits each state; this spec reloads them all a second time (and confidentiality a third). | Add "no `undefined` in `[data-screen]`" and the mock-claim check to the sweep loop; delete this file. | Low. |
| 4 | 15-19 | — | The failed-workflow detail check is a real content assertion. | Keep as one step in the sweep or in `journeys/workflows.spec.ts`. | none |
| 5 | 30-31 | A8 | Comment about the deferred SMS heads-up. | Delete. | none |

## Proposed end state
No file. The accessibility sweep's mock-state loop renders each state once per theme and asserts: no page/console error, no "undefined", no forbidden mock claim, plus its accessibility checks.
