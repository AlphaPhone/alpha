# test/plugin-worker-guard.test.mjs
- Lines: 95 | Kind: 1 host-JVM unit (real `PluginWorkers.java` + `test/fixtures/PluginWorkersTest.java`) + 6 source-text tests (regex over 13 Alpha plugin sources and 4 **vendor** Java files) | Verdict: MERGE test 1 into the Gradle JVM lane (interim `test/integration/native-plugin-workers.test.mjs`); DELETE the rest
- Covers: a bridge call delivered after `handleOnDestroy` stopped a plugin's worker is answered (not a `RejectedExecutionException` that kills the process). Duplicates: none for the guard itself. Callers/importers: `npm test` glob; it is the only importer of `test/fixtures/PluginWorkersTest.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12-14 | keep | Compiles the real `PluginWorkers.java` with its fixture main and runs it: the only behavioural case. | Keep; move with `PluginWorkersTest.java` to the Gradle JVM test source set (P6). | Low |
| 2 | 19-46 | T1 | Per-plugin regex lint: no `<worker>.execute(` outside `PluginWorkers.submit`, and a hand-kept table of worker field names per plugin. Every new worker or rename edits this table. | Delete. If the rule is wanted, it is a static lint (ErrorProne/a `grep` in `verify`), not a test. | Medium: loses the "every dispatch goes through the guard" net; the rule is real (round-8 crash). |
| 3 | 48-54 | T1/T2 | Slices `AlphaMapsTransportPlugin.request(` by text and regexes its `catch(RejectedExecutionException busy)` line. | Delete. | Low |
| 4 | 56-63 | T1 | Regexes 8 `*Selected` methods of `DailyAppsPlugin` and its exact `handleOnDestroy` text. | Delete. | Low |
| 5 | 65-71 | T1 | Inventory check that the table in #2 matches declared executor fields. | Delete with #2. | Low |
| 6 | 73-95 | T1/T5 | Regex over `vendor/eliza` `PermittedPhotosPlugin`, `PhotosPlugin`, `DeviceLibraryPlugin`, `LocalSpeechBridgePlugin` (indented text, exact `try {` shapes). Tests upstream code from this repo. | Delete; upstream owns those guards (D14 follow-up if wanted). | Low |

## Proposed end state
One host-JVM case: `PluginWorkers.submit` refuses work for a stopped, shut-down or full executor and answers the call.
It lives beside the other native JVM tests (Gradle JVM test source set; until that lane exists, a single
`runJvm` case in `test/integration/native-plugin-workers.test.mjs`). `test/fixtures/PluginWorkersTest.java` moves with it.
The source-shape tables and the vendor regexes are deleted. If the owner wants "all executor use goes through
`PluginWorkers.submit`" enforced, add it as a one-line lint step, not a node test.
