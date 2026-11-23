# test/quint-native-mms-dispatch.test.mjs
- Lines: 19 | Kind: Quint wrapper (native index, javac) + a historical-revision probe | Verdict: DELETE
- Covers: native MMS review, shared ID collisions and PDU custody (20 traces); the historical source reproduces two old approval regressions. Duplicates: native index runs `checkNativeMmsDispatch`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-12 | T4 | Aggregate duplicate. | Delete. | None |
| 2 | 14-19 | P6, A1 | `mmsSourceProbe(...,{historicalProbe:true})` compiles source at historical revision `b1817660…` (`mms-historical-sources.json`, `legacy/core/formal-source-inventory.mjs`) to show an old bug. Historical evidence. | Delete with the historical source inventory. | Low |

## Proposed end state
Deleted; the current MMS dispatch replay runs once from the native index.
