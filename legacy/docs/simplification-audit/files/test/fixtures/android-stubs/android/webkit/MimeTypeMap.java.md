# test/fixtures/android-stubs/android/webkit/MimeTypeMap.java
- Lines: 9 | Kind: fixture (Android host-JVM stub) | Verdict: KEEP (move into the shared stub set)
- Covers: three-entry `MimeTypeMap.getMimeTypeFromExtension` for the Files storage browser JVM tests. Duplicates: none. Callers/importers: only `test/files-browser.test.mjs:228,378` (StorageBrowserTest, StorageWatchSlotTest over the prepared upstream `plugin-native-filesystem` StorageBrowser). `git grep android-stubs` finds nothing else.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 | A8 | Comment says "StorageBrowserTest only"; StorageWatchSlotTest also uses it. | Fix the comment when moved. | none |
| 2 | dir | C4 | A one-file directory `android-stubs/` beside six other Android stub trees. | Move into the single stub set. | none |
| 3 | - | T5 | Its importer tests upstream `StorageBrowser.java` from the prepared vendor projection; whether Alpha should keep that test is a tests-host question (it is patched-native, so Alpha-owned behaviour). | Decide with `files-browser.test.mjs`. | Low |

## Proposed end state
Survives as long as `files-browser.test.mjs` keeps its two JVM cases (research: keep, Gradle android-jvm). Lives in the merged stub tree; delete it if those cases move to an upstream suite.
