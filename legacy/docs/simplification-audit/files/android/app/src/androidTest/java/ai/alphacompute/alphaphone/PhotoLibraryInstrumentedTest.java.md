# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PhotoLibraryInstrumentedTest.java
- Lines: 139 | Role: `AlphaPhotoLibrary` bridge over 60 real MediaStore fixtures: scope, paging, stable ids, literal LIKE, inspect, external edit/delete validation, change reads, Photos UI scope label | Verdict: KEEP (minor SIMPLIFY)
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:254` (gate `photoLibrary` → runner test requires `"1".equals(InstrumentationRegistry.getArguments().getString("photoLibrary")` on l.63); comment in `test/photo-library.test.mjs:3`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 26-32 | C3 | `js`, `until`, `call` (bridge await) twins. | Shared helpers. | None. |
| 2 | 33-51 | C3 | `fixture`/`write` MediaStore insert; twin of `PhotosTestFixture.fixture` (l.29) and five other inserts (see PhotoEdit finding 4). | `PhotosTestFixture.insert`. | Low (keep the `Pictures/AlphaPhone-library-tests` path or align with others). |
| 3 | 114 | T8 | `SystemClock.sleep(1100)` so the external edit gets a new second-resolution `date_modified`. | Keep with a comment (it is a real MediaStore granularity). | — |
| 4 | 136 | B1 (acceptable) | `catch(RuntimeException ignored){/* already gone */}` in fixture cleanup. | Keep. | — |
| 5 | 103 | B4 | `Math.min(24,ids.size())` after `assertEquals(FIXTURES, ids.size())` — size is known (60). | Use 24. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `FIXTURES` | const | 25 | none | keep |
| `js`/`until`/`call` | helper | 26-32 | ~60 / 8 copies | shared |
| `fixture`/`write` | helper | 33-51 | PhotosTestFixture:29 and 5 inserts | `PhotosTestFixture.insert` |
| `id`/`one` | helper | 52-60 | none | keep |

## Proposed end state
Same test with shared helpers; ~115 lines.

## Verification
`npm run test:android:instrumentation -- --classes PhotoLibrary` (Android 13+ emulator).
