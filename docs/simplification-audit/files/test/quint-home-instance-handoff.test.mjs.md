# test/quint-home-instance-handoff.test.mjs
- Lines: 12 | Kind: Quint replay wrapper (calls `checkHomeInstanceHandoff` from `specs/quint/refinement/native/home-instance-handoff.mjs`) | Verdict: DELETE
- Covers: `MainActivity` hand-off matches every HomeInstanceHandoff step (64 traces). Duplicates: `specs/quint/refinement/native/forward-replays.mjs` registers `HomeInstanceHandoff` and runs the same replay inside `test/quint-native-refinement.test.mjs`; `native/forward-replays.mjs` `owningAssertions` repeats this file's exact checks (64 traces, `frontStartArrives`, `steps > 500`, `reached.length === 6`). Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-12 | T4, P3 | Same replay executed twice per `npm test` (javac, 300 s budget). | Delete the wrapper. | None |
| 2 | 6 | — | Uses `jvmSkip('json','javac')` from `test/fixtures/jvm-tools.mjs`; the aggregate has no such skip. | Runner should apply one JVM skip rule per native campaign. | Low |

## Proposed end state
Deleted. `HomeInstanceHandoff` runs once through the native forward-replay list in the manifest runner.
