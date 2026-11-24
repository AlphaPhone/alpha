# test/accessibility-timeout.test.mjs
- Lines: 58 | Kind: unit (real `runtime/accessibility-timeout.ts` via `tsImport`, fake native port and app listener) | Verdict: DELETE
- Covers: toast duration scale from Android "Time to take action", stale-reply fencing, resume refresh. Duplicates: `test/quint-accessible-toast-lifetime.test.mjs` (12 traces through `specs/quint/refinement/application/accessible-toast-lifetime.mjs`, which loads the same module) and `test/browser/shell-toast.spec.ts`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-58 | T3, T4 | One-module unit test with a stub port; the same fence and scale rules are replayed by the Quint refinement campaign. | Delete. | Low |
| 2 | 7 | - | Module-level state is shared between tests (order-dependent: test 3 relies on test 2's scale). | Moot once deleted. | - |

## Proposed end state
File deleted. The Quint model `accessible-toast-lifetime` stays as the formal coverage (its harness should import the
module, not strip it: see the formal-chunk report). One journey case in `journeys/accessibility.spec.ts` with a stubbed
`recommendedTimeout` of 30 s asserting a toast stays visible beyond 5 s covers the user-visible behaviour.
