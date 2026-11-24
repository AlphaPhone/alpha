# android/sense/build.gradle
- Lines: 12 | Role: `:sense` listener APK descriptor: supplies product identity (version from `app.config.json`, profile `android/aosp/pixel10a-composition.json`, speech project) to the upstream `sense/consumer.gradle` | Verdict: KEEP
- Importers: `android/consumer-host.json:43`. Text/path pins: `test/sense-packaging-ndk.test.mjs:14-20` and `test/quint-indicator-provider.test.mjs:28-31` regex-match lines 5, 7 and 12 (T1); `specs/quint/native/manifest.json:1581` pins the path; `test/android-host.test.mjs:119,122`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-6 | C3 | `preparedSense = JsonSlurper().parseText(providers.exec { … 'scripts/prepare-patched-native.ts' }…)` — third copy of the same exec (`local-speech/build.gradle:6-9`, `video-fixture/build.gradle:26-29`). | Optional: have the host generator publish `rootProject.ext.patchedNativeRoot` once. Not worth a separate change. | Low |
| 2 | — | T1 | Two host tests assert this file's text with regexes. | When the T1 cleanup lands, delete those assertions (`sense-packaging-ndk.test.mjs:15-17`, `quint-indicator-provider.test.mjs:31-33`); the Gradle build proves the wiring. | None |
| 3 | — | A4 (owner) | Listener APK is development-only under P-78. | Owner decides with the P-78 question; file is fine as is. | — |

## Local types and helpers
None.

## Proposed end state
Unchanged, 12 lines.

## Verification
Sense build through the generated host; `node --test test/sense-packaging-ndk.test.mjs test/quint-indicator-provider.test.mjs test/always-on-listener.test.mjs`.
