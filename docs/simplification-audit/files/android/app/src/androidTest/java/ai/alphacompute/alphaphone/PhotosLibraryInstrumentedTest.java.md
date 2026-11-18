# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PhotosLibraryInstrumentedTest.java
- Lines: 51 | Role: upstream `PermittedMediaCatalog` generation fence rejects a stale page after a real provider rename, before the main-thread observer fires | Verdict: KEEP (owner question: move upstream)
- Importers: none. Calls upstream `PermittedMediaCatalog` (`fence`, `requireCurrent`, `Fence.until`, `cursorIdentity`). Text/path pins: `scripts/android-instrumentation.ts:256` (gate `photosLibrary` → runner test requires `"1".equals(InstrumentationRegistry.getArguments().getString("photosLibrary")` on l.22). Unrelated name clash: `specs/quint/legacy/PhotosLibrary.qnt` (renderer model, not this class).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 33-46 | T5 / research P20 | Pure upstream engine property (provider generation fence); no Alpha code involved. | Owner: move upstream with PhotosCatalogOrder. | Medium. |
| 2 | 25-31 | C3 | Owned MediaStore 8×8 JPEG insert — identical to `PhotosCatalogOrderInstrumentedTest.jpeg` (l.33-40, minus EXIF). | `PhotosTestFixture.insert`. | None. |
| 3 | 23 | B4 | `assertTrue(SDK_INT>=30)` hard assert. | Delete if minSdk ≥ 30. | None. |
| 4 | 48-49 | KEEP | Primary/cleanup suppression pattern. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| (inline fixture insert) | helper | 25-31 | PhotosCatalogOrder:33-40 | `PhotosTestFixture.insert` |

## Proposed end state
~45 lines with the shared insert; preferably upstream.

## Verification
`npm run test:android:instrumentation -- --owned-emulator --classes PhotosLibrary` (secondary user).
