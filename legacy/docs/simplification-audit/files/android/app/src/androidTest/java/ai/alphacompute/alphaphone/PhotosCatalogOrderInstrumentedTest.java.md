# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PhotosCatalogOrderInstrumentedTest.java
- Lines: 70 | Role: upstream `PermittedMediaCatalog` lists newest capture (EXIF DATE_TAKEN) first, one row per page, no repeats; proves MediaProvider accepts the sort | Verdict: KEEP (owner question: move upstream)
- Importers: none. Calls upstream `ai.eliza.plugins.media.PermittedMediaCatalog` directly.
  Text/path pins (T1): `scripts/android-instrumentation.ts:272` (`secondaryUser: true`); `test/android-instrumentation-runner.test.mjs:177-184` reads this file by path and matches `assertTrue\("Disposable secondary user required",android\.os\.Process\.myUid\(\)\/100000>0\)` (l.44); `:215` registry presence.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 56-64 | T5 / research P20 | Tests the upstream catalog class directly, no Alpha plugin/UI (`new PermittedMediaCatalog(c,()->{})`). Same applies to `PhotosLibraryInstrumentedTest`. | Owner: move upstream; or drive through `AlphaPhotos.listPermitted` (as `PhotosForeignLibraryInstrumentedTest` does) so it tests Alpha's surface. | Medium. |
| 2 | 33-40 | C3 | Owned MediaStore JPEG insert (seventh copy; see PhotoEdit finding 4). | `PhotosTestFixture.insert`. | None. |
| 3 | 44 | T1 pin | Assertion text is pinned verbatim by the runner test. | Keep verbatim until that T1 assertion is removed. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `jpeg` | helper | 33-40 | PhotosLibrary:25-31 (same 8×8 `0xff306090` JPEG), PhotosTestFixture:29 | `PhotosTestFixture.insert` |
| `taken` | helper | 41 | none | keep |

## Proposed end state
~60 lines with the shared insert helper; preferably moved upstream or rewritten against the Alpha bridge.

## Verification
`npm run test:android:instrumentation -- --owned-emulator --classes PhotosCatalogOrder` (secondary user); host runner test.
