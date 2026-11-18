# specs/quint/legacy/core/check-task-scheduling-refinement.mjs
- Lines: 230 | Kind: Quint refinement harness (historical/legacy family; bundles and runs real upstream `Semaphore` / `createSerialise`) | Verdict: DELETE (with legacy retirement)
- Covers: 8 schedules of upstream `Semaphore` (1 and 2 permits, AbortController cancellation, FIFO) against `specs/quint/legacy/CoreSemaphore.qnt`, and all 24 permutations of four calls through `createSerialise` against `CoreSerialise` (model path not even passed for Serialise, line 217).
- Duplicates: none in alphaphone; upstream source `vendor/eliza/packages/core/src/utils/task-scheduling.ts` (the code under test) has its own upstream tests. No services twin.
- Callers/importers: `specs/quint/refinement/legacy/index.mjs:23` and `test/quint-core-task-scheduling.test.mjs:4` (T4). CLI entry lines 226-230 used by nothing.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 201-204 | P6, T5 | Pure upstream utility (`Semaphore`, `createSerialise`) checked against translations of retired upstream TLA; no product code involved. | Delete with `CoreSemaphore.qnt`, `CoreSerialise.qnt`, manifest entries and the test wrapper. | Low |
| 2 | 1-230 | T3 | Unit test of two upstream functions in Quint clothing (one function, everything else synthetic). | Delete. | None |
| 3 | 5 | P6 | Imports `bundleVendorCore`, `deferred`, `tick` from `legacy/core/source-support.mjs`; those helpers are also imported by live harnesses and must move to `specs/quint/refinement/support.mjs` before legacy retirement (ci-and-formal §3). | No change here; deleting this file removes one importer. | None |
| 4 | 127-130 | — | Local `permutations` generator; fine but moot. | Delete with file. | None |
| 5 | 226-230 | A7 | Unused CLI entry with ad-hoc `--vendor-dir=` parsing. | Delete. | None |

## Proposed end state
Deleted with its two models, manifest entries, index row and `test/quint-core-task-scheduling.test.mjs`. Coverage of `Semaphore` / `createSerialise` is upstream's responsibility (D14 follow-up if wanted).
