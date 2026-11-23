# android/app/src/androidTest/java/ai/alphacompute/alphaphone/KeptCaptureLegacyPathInstrumentedTest.java
- Lines: 101 | Role: checks that a scan Keep reserved by an earlier install under `Pictures/` is still resolved after the capture folder moved to `DCIM/Camera/`. | Verdict: DELETE
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:253` registry entry; `test/owned-captures-legacy-path.test.mjs:4` names it in a comment (that host test exercises the same legacy lookup on the JVM and refers to a `patches/eliza/owned-captures-legacy-path.patch` that does not exist in the repo).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-101 | A1 | Entire class tests a legacy reader: "A scan Keep reserved by an install that still kept captures in Pictures/". The package was renamed on 2026-11-10 and starts with empty private data (DECISIONS D1), so no `Pictures/` reservation from an earlier install can exist. | Delete the class, its registry entry, `test/owned-captures-legacy-path.test.mjs`, and `.legacyCaptures("Pictures/")` plus its comment in `android/app/src/main/java/ai/alphacompute/alphaphone/AlphaMediaConfig.java:15-16` (and the "capture folder moved" sentence in its Javadoc L11). | Low (D1) |
| 2 | 36 | C3 | Inline SHA-256 (Base64) digest. | Gone with the file. | - |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `jpeg()` | helper | 30-33 | synthetic image builders in `Photo*InstrumentedTest`, `PhotosTestFixture` | delete |
| `rows/cleanup` MediaStore helpers | helper | 46-63 | `PhotosTestFixture` | delete |

## Proposed end state
File deleted (0 lines). `AlphaMediaConfig.MEDIA` keeps `.captures("DCIM/Camera/","SCAN_")` only. `OwnedMediaConfig.legacyCaptures` stays upstream (not ours to edit).

## Verification
`node --test test/android-instrumentation-runner.test.mjs`; `npm run verify`; Camera scan Keep journey (`Camera*`/`Photos*` instrumentation) on both variants.
