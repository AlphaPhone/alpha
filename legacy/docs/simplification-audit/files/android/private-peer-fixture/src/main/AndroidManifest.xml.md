# android/private-peer-fixture/src/main/AndroidManifest.xml
- Lines: 7 | Role: manifest of the probe APK: query for the Alpha package, signature permission `…peerfixture.permission.CONTROL`, exported `PrivateSocketProbeService` | Verdict: KEEP (one-attribute trim)
- Importers: Gradle module. Text/path pins: hashed by `scripts/ci/build-private-peer.py` (all of `src/`); permission name mirrored in `android/app/src/testMocks/AndroidManifest.xml:5-6` and `PrivateSocketProbeService.java:25`; `scripts/apk.ts:120` treats `peerfixture` as development-only manifest text.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | B4 | `android:debuggable="true"` on `<application>` — the debug build type sets it already (lint `HardcodedDebugMode`); only debug variants exist (`build.gradle:10`). `build-private-peer.py:25` asserts `application-debuggable` in badging, which the debug build type still provides. | Delete the attribute. | Low (verify badging once). |
| 2 | 3, 5 | C6 | Permission string `ai.alphacompute.alphaphone.peerfixture.permission.CONTROL` in 3 files (manifest, testMocks manifest, service `ALPHA+".peerfixture.permission.CONTROL"`). | Inherent to Android manifests; keep. | — |

## Local types and helpers
None.

## Proposed end state
Same 7 lines minus the `debuggable` attribute.

## Verification
`python3 scripts/ci/build-private-peer.py` (badging asserts), resident CI private-peer phase.
