# test/fixtures/ResidentScheduleRearmTest.java
- Lines: 44 | Kind: unit (pure policy class, no stubs needed) | Verdict: DELETE
- Covers: `ResidentScheduleRearm.decide`/`handles` for the four re-arming broadcasts and five ignored ones, and that `admitAndStart` runs admission and start under the lifecycle lock so a concurrent stop waits. Duplicates: `specs/quint/native/conformance.mjs:199-205` drives the real class for the `ResidentScheduling.qnt`/`ResidentSchedulingServiceAdmission.qnt` models (start under the same lock, busy lifecycle, locked boot). Callers/importers: only `test/digest-missed-run-now.test.mjs:88-94` (test 4; tests 3 lines 84-86 are source-text regexes).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-42 | T3, T4 | The model conformance already runs the same policy with the lock check. | Delete. | Low |
| 2 | 19-22 | — | "Other broadcasts are IGNORE" (`SCREEN_ON`, `LOCKED_BOOT_COMPLETED`, `TIME_TICK`) is the only case conformance does not show. | Add one `IGNORE` check to `conformance.mjs` if the owner wants it pinned. | Low |
| 3 | 34-41 | T8 | `stopper.join(100)` timing probe. | Goes with the file. | — |

## Proposed end state
Deleted, with test 4 (and the source-text test 3) of `digest-missed-run-now.test.mjs`. Re-arm policy coverage is
the Quint native conformance replay.
