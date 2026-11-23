# test/files-storage-refusal.test.mjs
- Lines: 30 | Kind: transplant (slices `AlphaFilesPlugin.java` between `private interface StorageWork` / `private static List<String> strings` and the `storageState` method into `test/fixtures/FilesStorageRefusalTest.java`, javac + run) + source-text regex | Verdict: DELETE
- Covers: every refused Files storage answer runs the watch cleanup first (denied, unmounted, each exception kind, closed worker, failing cleanup) and `storageState` reports the API-29 access kind. Duplicates: none. Callers/importers: `npm test` glob; `test/fixtures/jvm-tools.mjs`, `test/fixtures/FilesStorageRefusalTest.java`, `app.config.json`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-23 | T2 | Text markers in `AlphaFilesPlugin.java` (`// STORAGE_METHODS`, `// STATE_METHOD` placeholders) and a fixture that re-declares `JSObject`, `PluginCall`, `StorageCatalog`, `StorageBrowser`. Any reformat or method move breaks it (D9 formatter, U-L8 plugin base). | Delete. | Medium: cleanup-before-refusal loses its only test. |
| 2 | 27-29 | T1 | Regexes over `storageWatch` text (`long ticket=watch.request()`). | Delete. | Low |
| 3 | 7, 20 | B3 | Rewrites the fixture package from `fixture.identity` to the app id read from `app.config.json`. | Goes with the file. | Low |

## Proposed end state
File and `FilesStorageRefusalTest.java` deleted. If the refusal routing must stay covered, extract the `storage(call,
work, cleanup)` helper from `AlphaFilesPlugin` into a small class with a `PluginCall`-shaped port and test it in the
Gradle JVM `storage` suite (`android/app/src/test/.../FilesStorageTest.java`) with the same case table.
