# test/serial-storage-tasks.test.mjs
- Lines: 27 | Kind: JVM unit (javac `SerialStorageTasks.java` + `test/fixtures/SerialStorageTasksTest.java`, runs its `main`) + source-text (slices `AlphaConnectionPlugin.java` method bodies and regexes them) | Verdict: MERGE test 1 into the host-JVM runner (`test/android-jvm.test.mjs`); delete test 2
- Covers: Native secure-slot reads/CAS are answered strictly in order and a retired queue refuses queued and later work. Duplicates: none for the queue; `test/native-secure-slots.test.mjs` exercises slot semantics. Callers/importers: `npm test` glob only; fixture `test/fixtures/SerialStorageTasksTest.java` imported only here.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-15 | C3/T9 | Own `mkdtemp`/`javac`/`java` plumbing instead of `runJvm` from `test/fixtures/jvm-tools.mjs`. | Becomes one row in the JVM runner table. | Low |
| 2 | 16-27 | T1 | Regexes `AlphaConnectionPlugin.java` for `submitStorage(call,`, the exact `handleOnDestroy` statement order and `newFixedThreadPool(4)`; breaks on any reformat (D9 Prettier is TS-only, but Java is reformatted when touched). | Delete. | Low: wiring is exercised by instrumentation runs, not proven here either |

## Proposed end state
File deleted; `SerialStorageTasksTest` becomes one entry in the shared host-JVM runner (sources + main class + expected PASS line).
The concurrency primitive is the only risky part and has no other host coverage, so it stays.
