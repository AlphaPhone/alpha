# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PhotosTrashInstrumentedTest.java
- Lines: 196 | Role: Photos trash/undo/restore, favourites album, permanent delete, custom albums and a two-Activity album race, against real MediaStore rows. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:276` (`PhotosTrash: {}`); `test/native-deletion-admission.test.mjs:105` mentions the class in a comment only; runner reachability scan.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 154-194 | A4 / P14 | `twoActivityAlbumWritesPersistAndLateReceiptCannotCloseNewManager` launches `new Intent(context,AlphaAssistActivity.class).setAction(Intent.ACTION_ASSIST)` and evaluates JS in its bridge (`assistant(...)`). `AndroidManifest.xml:124` declares `.AlphaAssistActivity android:enabled="false"` (P-78) and no androidTest calls `setComponentEnabledSetting` (grep: 0 hits), so the launch cannot succeed on the current APK. | Delete the method plus `assistant()` and `blockedAlbumWorkers()` (~41 lines), or rewrite the concurrency half with two `changeAlbum` calls from the one MainActivity. Decide together with the dormant-assistant decision (P14). | low (test only; it cannot pass today) |
| 2 | 42-47, 67-71 | C3 | The owned-JPEG insert is written twice in this file (inline in the first test and as `fixture()`), and a third time in `PhotosTestFixture.fixture` (`:29`). | Use `PhotosTestFixture.fixture(resolver,"alpha-trash-",color)` everywhere; delete `fixture()` and the inline block. | none |
| 3 | 34 | C3 | `bytes()` duplicates `PhotosTestFixture.bytes`. | Static-import it. | none |
| 4 | 148-150, 193 | C3 | The "remove fixture albums from `alpha-owned-albums` under `AlphaPhotosPlugin.ALBUMS_LOCK`" block is written twice with different predicates. | One `removeAlbums(Context, Predicate<JSONObject>)`. | none |
| 5 | 79, 118 | C3 | The `_id=? AND media_type=1 AND owner_package_name=?` owned-row `Bundle` query is built twice. | One `ownedRowQuery(Context,Uri)`. | none |
| 6 | 65, 82, 149 | C6 | Literals `"alpha-owned-media-versions"`, `"alpha-owned-albums"`, `"Pictures/AlphaPhone-tests"` re-typed; owner is `AlphaMediaConfig`/upstream `PhotosPlugin`. | Reference the product constant (or one test constant) instead. | low |
| 7 | 22-24 | C3 / T7 | `host`, `ready` (200x100 ms), `click` re-implement `WebViewTestDriver` polling. | `WebViewTestDriver.until/clickLabel`. | none |
| 8 | 112, 162, 193 | D8 | 300-900-character lines. | Format; split assertions. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `host` / `ready` / `click` | helper | 22-24 | ~40 androidTest files | `WebViewTestDriver` |
| `ALBUM_MANAGER` | const | 26 | none | keep |
| `nativeCall(method,args)` | helper | 35-38 | `ReminderTimingInstrumentedTest.pluginBridge` (`:45-49`), `ReminderDeletionStorageInstrumentedTest.begin/result/invoke` (`:38-47`) — same "set window.__x, poll, parse" bridge call | `WebViewTestDriver.nativeCall(plugin,method,args)` |
| `include()` / `trashed()` / `state()` | helper | 31-33 | none | keep |
| `fixture` / `bytes` | helper | 67-71, 34 | `PhotosTestFixture.java:29-30` | `PhotosTestFixture` |
| `cleanup` | helper | 76-85 | addSuppressed aggregation in 5+ files | `TestCleanup` |
| `assistant` / `blockedAlbumWorkers` | helper | 154-160 | `AssistantResidentReuseInstrumentedTest.java:52,63` (assistant bridge eval) | delete with finding 1 |

## Proposed end state
Three tests (trash/undo/restore, favourites, permanent delete) plus custom album lifecycle stay. Delete the
AlphaAssistActivity race test and its two helpers; fixtures/bytes come from `PhotosTestFixture`; one `removeAlbums`,
one `ownedRowQuery`, shared `nativeCall` and poll helpers. ~120 lines.

## Verification
`--classes PhotosTrash` on both variants (Android 11+; requires empty app-owned trash). If the race scenario is kept in a
rewritten form, also run it; `test/native-deletion-admission.test.mjs` only carries a comment and needs no change.
