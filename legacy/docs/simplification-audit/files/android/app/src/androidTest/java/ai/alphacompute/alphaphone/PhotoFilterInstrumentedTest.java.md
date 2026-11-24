# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PhotoFilterInstrumentedTest.java
- Lines: 43 | Role: seven native photo filters (preview and export) match Chromium-measured CSS pixel goldens; original bytes immutable; reserved filter cannot change | Verdict: KEEP (SIMPLIFY helpers); owner question on upstream ownership
- Importers: none. Calls upstream `ai.eliza.plugins.media.OwnedPhotoEdits` directly with `AlphaPhotosPlugin.MEDIA_CONFIG`. Assets: `photo-filter-goldens.json`, `photo-filter-source.png`. Text/path pins: `scripts/android-instrumentation.ts:274`; `scripts/owner/emulator-campaign-check.ts:47,57`. (`test/photos-library-patch.test.mjs:168-170` stubs an upstream class named `PhotoFilter`, unrelated to this file.)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 29-41 | T5 / research P20 | Exercises the upstream engine `OwnedPhotoEdits` (begin/preview/save/cancel) without any Alpha UI or plugin; Alpha contributes only `MEDIA_CONFIG`. Filter parity is an upstream property. | Owner: move to upstream's media plugin tests; Alpha keeps one UI journey (PhotoEdit already clicks every filter). | Medium: upstream may lack Chromium goldens. |
| 2 | 32 | C3 | Inline SHA-256 hex loop; `PhotosTestFixture.hash` (l.31) exists. | `PhotosTestFixture.hash(canonical)`. | None. |
| 3 | 17, 18 | C3 | `bytes(InputStream)` and `revision(...)` (`date_added:_size:generation_modified:is_trashed`) — `revision` is duplicated in `PhotoReplaceInstrumentedTest.begin` (l.217-224). | Move `revision` to `PhotosTestFixture`. | None. |
| 4 | 41 | C6 | `"alpha-photo-edit-results"` literal (see PhotoEdit finding 5). | Constant from production. | None. |
| 5 | 19-26, 33-38 | D8 | 600-1,300-character lines. | Formatter. | None. |
| 6 | 28 | B4 | `assertTrue(SDK_INT>=30)` as a hard assert; others use `assumeTrue`. | Keep (minSdk ≥ 30 makes it impossible; delete if minSdk ≥ 30). | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `bytes` | helper | 17 | PhotoEdit:21, PhotoReplace:246-256, PhotosTestFixture:30 | `PhotosTestFixture.bytes` |
| `revision` | helper | 18 | PhotoReplace:217-224 | `PhotosTestFixture.revision` |
| `chart` | helper | 19-26 | none | keep |

## Proposed end state
If kept in Alpha: same test, shared fixture helpers, ~35 lines. Preferably moved upstream with its goldens.

## Verification
`npm run test:android:instrumentation -- --classes PhotoFilter`.
