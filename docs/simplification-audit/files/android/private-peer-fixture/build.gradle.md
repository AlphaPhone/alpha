# android/private-peer-fixture/build.gradle
- Lines: 11 | Role: Gradle descriptor of the debug-only ordinary-UID probe APK used by resident CI | Verdict: KEEP (one-line trim)
- Importers: module in `android/consumer-host.json:47`; built by `scripts/ci/build-private-peer.py` (`.github/workflows/resident-android.yml`), `scripts/gradle-verification.ts:37` `VERIFIED_TASKS`. Text/path pins: file bytes hashed into the CI archive by `scripts/ci/build-private-peer.py:8` and re-checked by `scripts/ci/resident_fixture.py:26`; `test/resident-native-ci-admission.test.mjs:47,51`; `test/android-host.test.mjs:119,122`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7, 10 | B4 | `buildFeatures { buildConfig true }` exists only so `PrivateSocketProbeService.java:56` can test `!BuildConfig.DEBUG`; but `variantFilter { … if (variant.buildType.name != 'debug') variant.setIgnore(true) }` already means only debug is ever built, so `BuildConfig.DEBUG` is always true. | Delete line 7 and the `!BuildConfig.DEBUG||` clause in the service. Keep the variant filter. | Low |
| 2 | 2 | — | Comment names `scripts/ci/build-private-peer.py` — accurate. | Keep. | — |

## Local types and helpers
None.

## Proposed end state
10 lines: application plugin, namespace/sdk/ids, Java 21, debug-only variant filter.

## Verification
`python3 scripts/ci/build-private-peer.py` (inside the resident CI archive flow), `node --test test/resident-native-ci-admission.test.mjs test/android-host.test.mjs`, resident-android workflow `PrivateResidentSocketInstrumentedTest` phase (`scripts/ci/resident-native.py:59`).
