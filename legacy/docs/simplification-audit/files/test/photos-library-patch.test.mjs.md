# test/photos-library-patch.test.mjs
- Lines: 392 | Kind: source-text (3 tests) + transplant (1) + Java compiled and run on the host JVM against upstream source (2) | Verdict: DELETE (upstream follow-up for 2 JVM cases)
- Covers: rules in upstream `plugin-native-media` Java (`PhotoLibraryAccess`, `PhotosPlugin`, `PermittedMediaCatalog`, `OwnedPhotoEdits`, `DocumentFolderTree`): reviewed-batch bounds, catalog ordering and page keys, replace-recovery receipts, retirement of folder grants. Duplicates: `test/photos-native-order.test.mjs` (verbatim copy of the NewestNeverDropped test); on-device `android/app/src/androidTest/.../PhotosCatalogOrderInstrumentedTest.java`, `PhotoReplaceInstrumentedTest.java` (10 recovery cases); `test/browser/photo-permitted-batch.spec.ts` (500 batch). Callers/importers: run by `npm test` (`scripts/run-node-tests.ts`); imports `test/fixtures/jvm-tools.mjs` and `scripts/prepare-patched-native.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-2 | A8 | The header names `patches/eliza/photos-library.patch`. That patch does not exist: `android/upstream-native-sources.json` has `"patches": []` and there is no `patches/` folder. `preparePatchedNative` now copies pinned upstream source unchanged, so every test here checks **upstream** code (T5). | Delete the file. Move the two JVM cases worth keeping upstream (D14 follow-up). | none |
| 2 | 18-28 | T1 | `FixNoCap` regex-matches Java constants, method bodies and `const PERMITTED_BATCH=500;` in `camera-adapter.ts`. | Delete. `photo-permitted-batch.spec.ts` drives the batch. | none |
| 3 | 35-73 | T4/T5 | NewestNeverDropped: regexes on `list(...)`, then javac of `PermittedMediaCatalog` plus stubs, a sort check and three page keys run on `node:sqlite` with TEXT-bound args. This is a verbatim copy of `photos-native-order.test.mjs:20-57`. Only the SQLite TEXT-binding check (an uncast `?` matches every row) is not trivial. | Move the SQLite page-key case to `vendor/eliza/plugins/plugin-native-media/test/native-host/PermittedMediaTest.java` (upstream). On-device: `PhotosCatalogOrderInstrumentedTest`. | low |
| 4 | 75-92 | T1 | The thumbnails-by-id test is regexes only, on Java and on `camera-adapter.ts`. | Delete. Covered by `photos-pending-read.production.spec.ts` ("reloads evicted thumbnails"). | none |
| 5 | 96-284 | T5 | Replace recovery: 190 lines of inline Java stubs (`Uri`, `Context`, `ContentResolver`, `SharedPreferences`) and a 15-case driver for `OwnedPhotoEdits.result`. The `legacy` case (a record without `editBackup`, line 265) is an A1 reader. | Delete here. `PhotoReplaceInstrumentedTest` covers the same receipts on a device. If host coverage is wanted, it goes upstream with the module. | low |
| 6 | 286-293 | T1 | "Photos 8" regex-matches `thumbnails` parameter plumbing. | Delete. | none |
| 7 | 295-392 | T2 | Folder retirement slices `forget()`, `adopt()` and `keptMessage()` out of `DocumentFolderTree.java` by text and splices them into a home-made class with fake `Uri`, `SharedPreferences` and resolver. | Delete. Ask upstream whether `FolderSessionTest.java` covers retirement; if not, add it there. | medium (behaviour then has no host coverage in this repo) |
| 8 | 9-16, 32-34, 97 | T9 | Skips when `vendor/eliza`, the Android SDK, the Capacitor sources or `jsonJar` are missing. The verify job has no Android SDK, so 3 of 6 tests never run in CI. | Gone with the file. | none |
| 9 | 14 | cost | `preparePatchedNative({root})` materialises all 17 native modules into a temporary tree, then up to three javac and java runs (120 s timeouts). | Gone with the file. | none |

## Proposed end state
File deleted. Product Photos behaviour stays covered by the Photos instrumented tests (device lane) and the camera-photos Playwright journey.
Upstream follow-ups (D14, `cross-file-actions.md` §6): (a) the SQLite TEXT-binding page-key check for `PermittedMediaCatalog.after`;
(b) `DocumentFolderTree.forget/adopt` retirement races, if `FolderSessionTest` lacks them.
`test/fixtures/jvm-tools.mjs` loses this importer (check its other importers before deleting it).
