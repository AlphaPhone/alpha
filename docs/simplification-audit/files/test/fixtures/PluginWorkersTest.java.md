# test/fixtures/PluginWorkersTest.java
- Lines: 34 | Kind: Java fixture, single-class unit (`PluginWorkers.submit` over real executors) | Verdict: MERGE into the Gradle JVM resident/runtime suite
- Covers: submitting to a live worker runs the task; a shut-down, shut-down-now or full bounded worker refuses once without throwing and never runs the task. Duplicates: `test/fixtures/FilesStorageRefusalTest.java` exercises the closed-worker case through Files (being deleted). Callers/importers: `test/plugin-worker-guard.test.mjs:13` (the rest of that 95-line file is reviewed separately).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T3 | Small, but `PluginWorkers` becomes the base of the planned `AlphaPlugin` worker helper (cross-file-actions U-L8); this is its contract. | Keep as one method in the runtime suite; extend when U-L8 lands. | Low |
| 2 | 30 | T8 | Uses `CountDownLatch` and `awaitTermination` rather than sleeps. Good. | Keep. | Low |

## Proposed end state
`pluginWorkersRefuseWithoutThrowing` in the Gradle runtime suite. Fixture deleted from `test/`.
