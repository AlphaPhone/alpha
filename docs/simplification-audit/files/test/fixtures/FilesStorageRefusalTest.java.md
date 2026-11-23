# test/fixtures/FilesStorageRefusalTest.java
- Lines: 75 | Kind: Java transplant template (placeholders `// STORAGE_METHODS` and `// STATE_METHOD` are replaced with slices of `AlphaFilesPlugin.java`; re-declares `JSObject`, `JSArray`, `PluginCall`, `StorageBrowser`, `StorageCatalog`) | Verdict: DELETE (with `test/files-storage-refusal.test.mjs`)
- Covers: Files storage refusals run the watch cleanup before the one answer, map exceptions to statuses, survive a closed worker and a failing cleanup; `storageState` reports access and the API-29 flag. Duplicates: none. Callers/importers: `test/files-storage-refusal.test.mjs:19` only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 33-34 | T2 | Text placeholders for sliced product methods. | Delete. | Low |
| 2 | 13-31 | T3 | Fake Capacitor and upstream classes declared inline. | Delete. | Low |
| 3 | 44-73 | coverage | The refusal table is worth keeping if the product extracts the helper (see the importer's report). | Carry the table into a Gradle `FilesStorageTest` only after the extraction. | Medium |

## Proposed end state
Deleted. Optional replacement: a Gradle JVM test of an extracted `StorageCall` helper with the same seven refusal rows.
