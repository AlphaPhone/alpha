# specs/quint/refinement/native/action-recovery.mjs
- Lines: 85 | Kind: Quint refinement driver (Node; runs `ActionRecoveryTraces.java` for 33 cases, one JVM each, then `checkTraces`) | Verdict: KEEP; SIMPLIFY
- Covers: model `NativeActionRecovery` (live): restart recovery of journal rows for notices, reads, reminder create/update/snooze/cancel/complete and Calendar/reminder deletions; foreign/changed/legacy rows; storage faults. Duplicates: `test/quint-pending-action-recovery.test.mjs` is a different (application) model; `test/quint-native-action-recovery.test.mjs` re-runs this driver (T4). Callers: `index.mjs:62`; `test/quint-native-action-recovery.test.mjs`; native aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 34-35, 37 | A1 (owner question) | Cases `legacy-missing-binding-settled`, `legacy-missing-binding-applying`, `reminder-legacy-no-attempt` replay rows without `enrollmentId`/attempt id. On a renamed package with empty data (D1) they exist only if the current writer can produce them. | Confirm with the `ActionRecoveryTraces.java` report; if the writer always stores them, delete these 3 cases with the model branch. | Medium (model change) |
| 2 | 58-71 | B5 | Asserts `android/consumer-host.json` module entries by deep-equal and re-hashes upstream inputs against the lock before running. These pin build configuration, not behaviour; `checkTraces` already records driver hashes. | Keep the lock-hash check in one shared helper (`assertPinnedUpstream(paths)`, used by about ten native drivers); drop the consumer-host deep-equal. | Low |
| 3 | 53-56 | B5 | Hand-maintained `sources` list (17 entries) for receipts. | Shared `nativeDriverSources(harness, extras)` helper. | Low |
| 4 | 16-46 | — | Case table is clear. | Keep. | — |

## Proposed end state
About 50 lines: case table, one shared pin check, `javaTraceCampaign`, `checkTraces`. Legacy cases removed if D1 confirms. Run only from the native aggregate.
