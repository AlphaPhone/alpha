# test/fixtures/SerialStorageTasksTest.java
- Lines: 27 | Kind: unit (one 22-line Alpha class with latches) | Verdict: DELETE
- Covers: `SerialStorageTasks` runs storage operations one at a time (response finishes before next read/CAS) and, once closed, interrupts the running task, rejects queued and later work. Duplicates: `specs/quint/refinement/native/credential-coordinator.mjs:11` compiles `SerialStorageTasks.java` with the real `AlphaConnectionPlugin`, so the lane runs inside the credential coordinator replay. Callers/importers: only `test/serial-storage-tasks.test.mjs:9-16` (test 1; test 2 at 17-26 is source-text over `AlphaConnectionPlugin.java`, T1).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-26 | T3 | Single-class unit test of an executor wrapper. | Delete with the whole `serial-storage-tasks.test.mjs`. | Low-medium: retirement (reject queued work) is checked only indirectly by the replay. |
| 2 | 13 | T8 | Asserts a negative with `second.await(100ms)`. | Goes with the file. | — |
| 3 | 10, 19 | D8 | Multi-statement lambdas on one line. | — | — |

## Proposed end state
Deleted. Serialized storage lane coverage is the credential-coordinator Quint replay, which drives the real plugin
methods through `submitStorage`.
