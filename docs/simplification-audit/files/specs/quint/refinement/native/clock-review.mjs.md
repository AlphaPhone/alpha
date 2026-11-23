# specs/quint/refinement/native/clock-review.mjs
- Lines: 71 | Kind: Quint refinement driver (Node; runs `ClockReviewTraces.java` for 27 scenarios) | Verdict: KEEP; SIMPLIFY
- Covers: model `NativeClockReview` (live): agent-proposed alarm review dialog, late dialog callbacks, fabricated/mismatched receipts, approval committed before failure report, show/snooze/dismiss handoffs, refusal vs terminal receipt ordering, expiry/retire/lock after consume. Duplicates: `test/quint-native-clock-review.test.mjs` (T4); Android `ClockHandoffInstrumentedTest` covers device delivery. Callers: `index.mjs:52`, that test; `clockReviewSourceTraces` exported (grep for other importers: none found outside this directory's test).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 49, 65 | A1 (owner question) | Scenario `legacy-exact-replay` seeds "a retained legacy terminal row". If that row shape can only come from an older writer, D1 deletes it with the model branch; if it is the current bare terminal shape, rename it. | Decide with the `ClockReviewTraces.java` report. | Medium |
| 2 | 41-47 | B5 | Re-checks that upstream inputs have no staged patch and match the lock. | Shared pin helper. | Low |

## Proposed end state
Scenario table, shared pin check, campaign, `checkTraces`; legacy scenario resolved per D1.
