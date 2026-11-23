# test/files-browser.test.mjs
- Lines: 384 | Kind: mixed: unit tests of upstream modules over a hand-written fake library (lines 13-217, 291-313, 350-364), source-text regexes over `template.html`, `model.js`, the upstream adapter, upstream Java and `AlphaFilesPlugin.java` (218-226, 230-290, 314-349, 365-384), and two host-JVM runs of upstream `StorageBrowser.java` with fixtures (227-229, 377-379) | Verdict: DELETE
- Covers: Files volume rules (free space, categories as queries, no-overwrite naming, Trash origin/restore/expiry, path escape, sort, agent filter, reviewed identities) and native StorageBrowser/StorageCatalog behaviour. Duplicates: Playwright `files-bulk`, `files-location-layout`, `files-sort-directions`, `files-agent-filter`, `files-dialog-*` specs; upstream `vendor/eliza/plugins/plugin-files/test/browser-sort-order.test.mjs`, `browser-agent-filter.test.mjs`, `plugin-native-filesystem/test/storage-watch.test.mjs`; androidTest `StorageCategoriesInstrumentedTest`; `test/files-agent-patch.test.mjs`. Callers/importers: `npm test` glob; imports `test/fixtures/jvm-tools.mjs`, `scripts/prepare-patched-native.ts`, fixtures `StorageBrowserTest.java`, `StorageWatchSlotTest.java`, `android-stubs/android/webkit/MimeTypeMap.java`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-8, 13-47 | T5 + T3 | `storage-model.ts`, `storage-volume.ts`, `files-agent-contract.ts` are upstream plugin-files code (from `.eliza/client-features`, no Alpha patch). The "library" is a 20-line fake of `BrowserFiles`; `navigator.storage` is redefined globally. | Delete; the volume rules belong in upstream plugin-files tests. | Medium (the browser Trash/restore rules lose host coverage here; journeys cover them through the UI) |
| 2 | 218-226 | T1 + A3 | Slices `template.html` from `<sc-if value="{{is.files}}">` to `<sc-if value="{{is.wallet}}">` and `model.js` by markers. The Wallet marker disappears with D2, so this case breaks on deletion. | Delete. | Low |
| 3 | 230-290, 314-349, 365-376 | T1 | Regexes over the upstream adapter, upstream `StorageCatalog.java`/`StorageBrowser.java` and `AlphaFilesPlugin.java` (e.g. 283 compares `EMPTY_BATCH` with `BATCH_MAX` by regex, 284 pins `b.emptyTrash(strings(call,"ids",StorageBrowser.BATCH_MAX))`, 261 reads an androidTest file's text). | Delete. | Low |
| 4 | 227-229, 377-384 | T5 | javac of upstream `StorageBrowser.java` (staged unmodified from the pin) with `StorageBrowserTest.java` / `StorageWatchSlotTest.java`; 379-384 then regexes `AlphaFilesPlugin.java`. | Delete; move both Java fixtures upstream with plugin-native-filesystem. | Low |
| 5 | 10 | cost | `preparePatchedNative()` at import time stages the whole patched native tree for one directory path. | Goes with the file. | Low |
| 6 | 1, 13-45 | D8 | Minified-style single-line helpers. | Goes with the file. | Low |

## Proposed end state
File deleted. Behaviours worth keeping and where they go:
- No overwrite on move ("a (1)"), Trash keeps origin and restores there (recreating the folder), confirmed Empty only
  deletes the items shown, 30-day expiry: `journeys/files.spec.ts` (from `files-bulk.spec.ts`).
- Agent filter is read-only and reviewed identities bind move/trash: `journeys/files.spec.ts` agent cases.
- Native StorageBrowser and StorageWatch slot: upstream plugin-native-filesystem tests (follow-up), plus
  `StorageCategoriesInstrumentedTest` on device.
`StorageBrowserTest.java`, `StorageWatchSlotTest.java` and `android-stubs/android/webkit/MimeTypeMap.java` lose their
only importer here (check the stubs tree for other users before deleting it).
