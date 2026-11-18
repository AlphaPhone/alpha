# test/shade-row-custody.test.mjs
- Lines: 57 | Kind: transplant (via `test/fixtures/shade-row-custody.mjs`: slices `notifications-adapter.ts` from `const opaque` to `type Notice =` plus the installer, runs with fake timers and a closed bridge) | Verdict: DELETE
- Covers: Shade rows: a held poll cannot publish into a later visit; retained open/dismiss/Clear All handlers refuse replaced rows or a locked/retired shade. Duplicates: `test/quint-shade-row-custody.test.mjs` and the aggregate `quint-application-refinement.test.mjs` drive the same fixture through `specs/quint/refinement/application/shade-row-custody.mjs`. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-11 | T2 | Depends on the sliced fixture; any edit between the markers changes what runs. | Delete. | Low |
| 2 | 13-57 | T4 | Five hand-written scenarios duplicate model traces the refinement already checks (10 traces). | Delete. | Low |

## Proposed end state
File deleted. Fixture `test/fixtures/shade-row-custody.mjs` survives only for the Quint harness, which needs a PORT to import
`installNotificationsAdapter` instead of slicing. `quint-shade-row-custody.test.mjs` is itself a T4 duplicate of the aggregate.
