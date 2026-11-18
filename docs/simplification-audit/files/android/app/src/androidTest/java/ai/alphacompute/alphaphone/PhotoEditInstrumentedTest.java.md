# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PhotoEditInstrumentedTest.java
- Lines: 80 | Role: real native photo edit through the Photos UI: cancel, rotate/crop geometry, lost-response reconciliation, interrupted receipt, every filter preview, late save after leaving Photos, stale trashed source; plus a granted-library save test | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:271` (`PhotoEdit: {}`); `scripts/owner/emulator-campaign-check.ts:47` (Media group) and `:57`; runner test `:647-655`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 54-79 | A7 / T9 | `grantedLibrarySaveOpensTheCopyAndConfirms` is gated on `-e photoLibraryGrantTest true`; whole-repo grep for `photoLibraryGrantTest`: only this file. No runner or campaign passes it, so it never runs. | Either register a campaign (e.g. `PhotoEdit` `args: {photoLibraryGrantTest:"true"}` in a separate entry) or delete lines 54-79. Recommend delete; `PhotoLibraryInstrumentedTest` already covers granted access. | None (never runs). |
| 2 | 31, 68 | T6 (Android form) | Monkey-patches `Capacitor.nativePromise` in-page to observe edit metadata and to inject lost/held responses. The injection is the point of the test (fault injection at the bridge), the observation part is not. | Keep the fault injection; read geometry from the DOM (the viewer shows `61 × 92`) instead of `__editMeta` where possible. | Medium. |
| 3 | 17-22 | C3 | `js`, `until`, `click`, `call` (bridge await), `bytes` (bounded read) — twins in PhotoFilter:17, PhotoReplace:246-256, PhotosTestFixture:30, PhotoLibrary:26-32, PhotosBatch:24-34. | Shared WebView helpers + `PhotosTestFixture.bytes`. | None. |
| 4 | 26-27, 62-63 | C3 | Owned MediaStore PNG insert (`_display_name`, `mime_type`, `relative_path=Pictures/AlphaPhone-tests/`, `is_pending` 1→0) repeated twice here and in PhotoFilter:31-32, PhotoReplace:44-54, PhotoLibrary:33-45, PhotosCatalogOrder:33-40, PhotosLibrary:25-31, `PhotosTestFixture.fixture` (l.29). | One `PhotosTestFixture.insert(resolver, name, mime, writer)`. | Low. |
| 5 | 39, 52, 78 | C6 | Literal `"alpha-photo-edit-results"` (upstream receipt preferences, named in `AlphaMediaConfig.java:8`) here ×3 and in PhotoFilter:41, PhotoReplace:63,106,182. | Expose the name from `AlphaMediaConfig` / `OwnedMediaConfig` and use it. | None. |
| 6 | 29, 35, 46 | C6 | `'alpha.photos.pending-copy.v1'` localStorage key literal ×4; renderer owns it. | Keep in test (it pins the persisted key by design) but one constant. | None. |
| 7 | 33-50 | D8 | Lines up to 1,000+ characters with 10+ statements. | Formatter; split the one test into named phases. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `js`/`until`/`click` | helper | 17-19 | ~60 files | `WebViewTestDriver` |
| `call` | helper | 20 | 8 bridge-await copies | `WebViewTestDriver.nativeCall` |
| `bytes` | helper | 21 | PhotoFilter:17, PhotoReplace:246-256, PhotosTestFixture:30 | `PhotosTestFixture.bytes` |
| `copies` | helper | 22 | none | keep |

## Proposed end state
One test (the granted-library test deleted or properly registered), shared Photos fixture and WebView helpers,
receipt-preference name from production. Estimated 80 → ~50 lines.

## Verification
`npm run test:android:instrumentation -- --classes PhotoEdit`; `node scripts/owner/emulator-campaign-check.ts` Media group.
