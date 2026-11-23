# test/fixtures/StorageWatchSlotTest.java
- Lines: 30 | Kind: unit (upstream nested class `StorageBrowser.WatchSlot`) | Verdict: DELETE
- Covers: a watch requested then unwatched registers nothing; a newer request supersedes an older queued one; a new watch stops the previous; unwatch stops it; a failed registration has no publication authority. Duplicates: upstream `vendor/eliza/plugins/plugin-native-filesystem/test/storage-watch.test.mjs` tests the same generations (newer supersedes stale, unwatch settles, retired install refused, failed cleanup loses authority). Callers/importers: only `test/files-browser.test.mjs:377-378` (that test's remaining lines 379+ are source-text regexes over `AlphaFilesPlugin.java`, T1).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-29 | T4, T5 | Upstream already tests this class's generation rules. | Delete; drop line 378 of the importer. | Low |

## Proposed end state
Deleted. Watch-slot rules stay covered upstream.
