# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaPhotosPlugin.java
- Lines: 32 | Role: Capacitor `AlphaPhotos` registration of the shared PhotosPlugin with Alpha's media config, QA markers and late-launch answer. | Verdict: SIMPLIFY
- Importers: Registered in `MainActivity`; androidTest `PhotoFilterInstrumentedTest` (`MEDIA_CONFIG`), `PhotosTrashInstrumentedTest`, `VideoCopyClosedFailureReviewInstrumentedTest` (`preserveClosedVideoCopy`). Text/path pins: `test/context-selection.test.mjs:132` (regex `mediaConfig(){return MEDIA_CONFIG;}`), `test/photos-debug-diagnostics.test.mjs:16,30-32` (regex `qaMarker`), `test/native-plugin-teardown.test.mjs`, `test/native-read-epoch.test.mjs`, `test/photo-library-permission-owner.test.mjs`, `test/plugin-worker-guard.test.mjs`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-21 | C6 | Same four `@Permission` aliases as `AlphaPhotoLibraryPlugin.java:11-16`. | Shared constants (see AlphaPhotoLibraryPlugin). | low |
| 2 | 25 | D4 | `static final OwnedMediaConfig MEDIA_CONFIG=AlphaMediaConfig.MEDIA;` - alias of an existing constant; only other reader is `PhotoFilterInstrumentedTest:29`. | Delete alias; return `AlphaMediaConfig.MEDIA`; point the test at `AlphaMediaConfig.MEDIA`; update the regex in `test/context-selection.test.mjs:132` (or delete that T1 assertion). | low |
| 3 | 24, 28 | D4 | `static void qaMarker(...)` called only by `diagnostic(...)` in this file (grep: no other Java caller; `test/photos-debug-diagnostics.test.mjs` regexes it). | Inline into `diagnostic(...)`; update/delete the T1 regex test. | low |
| 4 | 30-31 | D7 | `void preserveClosedVideoCopy(...)` package-private, "deliberately absent from the Capacitor/JS API"; only caller is androidTest `VideoCopyClosedFailureReviewInstrumentedTest:46`. | Delete; have the test call the inherited `preserveClosedFailure` through a testMocks-only accessor, or delete the test if the reviewed-recovery path has no production entry point (owner question). | medium (removes test-only reachability of a recovery path) |
| 5 | 29 | P18 | `closedMessage(){return LateLaunch.CLOSED;}` | Base-class default (cross-file). | low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| MEDIA_CONFIG | const | 25 | AlphaMediaConfig.MEDIA (same object) | delete |
| qaMarker | helper | 24 | none | inline |

## Proposed end state
Annotation + 4 overrides (`mediaConfig`, `playbackPath`, `diagnostic`, `closedMessage`); ~24 lines. Estimated lines after: 24.

## Verification
androidTest Photo* suites; `test/photos-debug-diagnostics.test.mjs`, `test/context-selection.test.mjs` regexes must be edited in the same change.
