# specs/quint/refinement/application/shade-row-custody.mjs
- Lines: 107 | Kind: Quint refinement harness over `test/fixtures/shade-row-custody.mjs` (text slice of `notifications-adapter.ts` run in a VM) | Verdict: KEEP (fixture PORT)
- Covers: `ShadeRowCustody` — shade rows: coalesced polls retire on shade close/reopen, revised rows refuse retained open/swipe/select/clear, Clear All cannot take newly arrived rows, lock/visibility/device/unmount retire callbacks, list diagnostics dedupe. Product: `apps/app/src/prototype/notifications-adapter.ts`, `template.html`. Duplicates: `test/shade-row-custody.test.mjs` (5 hand-written cases on the same fixture, a subset of these 10 schedules). Callers: `test/quint-shade-row-custody.test.mjs`, `index.mjs` aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3 | T10 (via fixture) | Fixture slices the adapter between `'const opaque'` / `'type Notice ='` and from `'export function installNotificationsAdapter'`. | Port fixture to an esbuild bundle of the exported adapter (shared with the shade-notice fixture: one notifications fixture). | M |
| 2 | — | T4 | `test/shade-row-custody.test.mjs` repeats a subset of these schedules without the model. | Delete the host test once this harness runs per-model. | L |
| 3 | 18-25 | C6 | Maps user-visible toast strings (`'Alerts didn’t load'`, `'Unavailable'`) to model diagnostics; copy changes break the harness. | Acceptable boundary; import the strings from the adapter if it exports them. | L |
| 4 | 15 | B3 | Asserts the fixture's own selection context shape. | Drop. | L |

## Proposed end state
Unchanged schedules on a bundled adapter, one notifications fixture shared with shade-notice-question, one test entry.
