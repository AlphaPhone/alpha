# test/fixtures/StorageBrowserTest.java
- Lines: 148 | Kind: integration (host JVM: upstream `StorageBrowser` over a real temporary folder, symlinks included; one `MimeTypeMap` stub) | Verdict: KEEP; upstream follow-up (move to `vendor/eliza/plugins/plugin-native-filesystem/test`, D14)
- Covers: Files move/copy keep both on a clash and never overwrite; missing selections are skipped; a reviewed identity refuses a same-size, same-mtime replacement; Trash is hidden, records origin, restores keeping both, expires after 30 days, empties only confirmed ids; paths cannot leave the volume or name the trash; no move into itself; rename refuses clashes, case-only clashes and hidden names; the Downloads category; failed recursive copy leaves nothing; folder search skips hidden/trash; symlinks never let listing, copy, retention, empty or Trash writes reach outside the volume. Duplicates: none. Upstream tests only `WatchSlot` (`plugin-native-filesystem/test/storage-watch.test.mjs`); the renderer `BrowserStorageVolume` cases in `test/files-browser.test.mjs` cover the browser implementation, not this class. Callers/importers: only `test/files-browser.test.mjs:227-229`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 110-147 | — | The symlink-escape checks are the only host proof that Files cannot read or delete outside shared storage. | Keep. | High if deleted |
| 2 | 1-148 | T5 | Tests unmodified upstream code (no native patches in `android/upstream-native-sources.json`). | Upstream follow-up; keep here until upstream has it. | — |
| 3 | 73-77, 93-97 | — | Case-collision and unreadable-file branches run only when the host filesystem allows (case-insensitive FS / non-root). On a case-sensitive Linux runner as root they silently do nothing. | Print a `SKIP` line so the importer can tell. | Low |
| 4 | importer | P3 | The importer compiles from `preparePatchedNative()` though nothing is patched. | Compile the vendor source path directly. | Low (cost) |
| 5 | 14-109 | D8 | One long `main`. | Split into named scenario methods when moved. | — |

## Proposed end state
Same scenarios as named methods, in the upstream plugin's JVM test (or Alpha's Gradle `files` JVM suite until
then), compiled from the vendor source without the patch materialization step.
