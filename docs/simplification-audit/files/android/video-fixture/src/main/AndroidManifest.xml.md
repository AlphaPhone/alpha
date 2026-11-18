# android/video-fixture/src/main/AndroidManifest.xml
- Lines: 6 | Role: manifest of the video QA APK declaring the non-exported `VideoFixtureActivity` | Verdict: DELETE (with the module)
- Importers: Gradle module only. Text/path pins: none.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-6 | A7 | Part of the never-built `video-fixture` module (see `android/video-fixture/build.gradle` report). | Delete. | None |

## Local types and helpers
None.

## Proposed end state
Deleted.

## Verification
`node --test test/android-host.test.mjs` after removing the module row.
