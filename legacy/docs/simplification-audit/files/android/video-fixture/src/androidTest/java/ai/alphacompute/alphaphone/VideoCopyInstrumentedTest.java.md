# android/video-fixture/src/androidTest/java/ai/alphacompute/alphaphone/VideoCopyInstrumentedTest.java
- Lines: 203 (25.8 KB) | Role: physical-device test of upstream `VideoCopyEdits` (trim/rotate/crop/audio, journal recovery, cancellation, late callbacks, custody holds) inside the video-fixture APK | Verdict: DELETE
- Importers: none outside the module; `Response` inner class is imported by `VideoCopyPreservationInstrumentedTest.java:25`. No runner: grep `VideoCopyInstrumentedTest` → only the two files in this module; not in `scripts/android-instrumentation.ts`. Uses assets `qa-source.mp4` and `qa-long.mp4` (the latter has no other reader).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-203 | A7 / T5 | Never run (module never built). Tests upstream `ai.eliza.plugins.media.VideoCopyEdits`, not Alpha code; Alpha supplies only `AlphaMediaConfig.MEDIA`. | Delete with the module. If physical codec coverage is wanted, propose it to upstream `plugin-native-media` androidTest. | Low |
| 2 | 149-152 | T3 | Reflection into private fields/methods of upstream (`getDeclaredField("active")`, `"saveCall"`, `"io"`, `getDeclaredMethod("finish",…)`) — breaks on any upstream refactor. | Goes with the file. | — |
| 3 | 107, 121-122, 130, 139-140 | B5 | Writes `video-qa-result.json` / `video-qa-lifecycle.json` evidence reports nobody collects (grep: 0 readers). | Goes with the file. | — |
| 4 | 64, 54-57, 165-167 | C3 / C5 | Private SHA-256 digest, MediaStore insert-pending-then-publish copies repeated 4× in this file and again in `VideoCopyPreservationInstrumentedTest.java:38-40,89,105`. | Goes with the file. | — |
| 5 | 42-202 | D8 | 400–1,000-character lines. | Goes with the file. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `Response extends PluginCall` | class | 45-51 | Bridge-call fakes in app androidTest (T7: hand-written Capacitor fakes) | deleted |
| `digest(Uri)` | helper | 64 | `VideoCopyPreservationInstrumentedTest.hash` (`:33`), `MediaFixtureActivity.sha` | deleted |
| `source(String)` MediaStore seeding | helper | 53-58 | `VideoCopyPreservationInstrumentedTest.Pending` (`:37-42`) | deleted |

## Proposed end state
Deleted.

## Verification
Nothing runs it today; after deletion `npm run verify` and the Android build.
