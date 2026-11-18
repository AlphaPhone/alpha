# test/quint-native-sms-dispatch.test.mjs
- Lines: 17 | Kind: Quint wrapper (native index, javac) + a historical-revision probe | Verdict: DELETE
- Covers: native SMS review, radio admission and callback readback (27 traces); the historical source reproduces the cross-dialog binding regression. Duplicates: native index runs `checkNativeSmsDispatch`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-12 | T4 | Aggregate duplicate. | Delete. | None |
| 2 | 14-17 | P6 | `historicalSmsSourceTraces` runs historical revision source. | Delete with the historical inventory. | Low |

## Proposed end state
Deleted; SMS dispatch runs once from the native index.
