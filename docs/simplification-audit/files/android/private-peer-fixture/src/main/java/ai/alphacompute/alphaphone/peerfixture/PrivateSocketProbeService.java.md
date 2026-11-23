# android/private-peer-fixture/src/main/java/ai/alphacompute/alphaphone/peerfixture/PrivateSocketProbeService.java
- Lines: 61 | Role: bound service in a separate ordinary UID that, once per run id, stats and tries to connect to Alpha's private `files/ipc/a.sock` and returns errnos to the signature-holding controller | Verdict: KEEP (minor SIMPLIFY)
- Importers: bound by `android/app/src/androidTest/.../PrivateResidentSocketInstrumentedTest.java:60` (reads the parcel fields in order: uid, runId, path, statErrno, connected, targetRoot, rootErrno, ownRoot, st_uid, st_mode). Text/path pins: source bytes hashed by `scripts/ci/build-private-peer.py` / `scripts/ci/resident_fixture.py`; extras `privatePeerFixture`, `runId` and phase name in `scripts/ci/resident-native.py:59`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 56 | B4 | `if(!BuildConfig.DEBUG||…)` — only debug variants are built (`build.gradle:10`). | Drop `!BuildConfig.DEBUG||` (and `buildConfig true` in build.gradle). | Low |
| 2 | 58 | C3 | `id.matches("[0-9a-f-]{36}")` accepts non-UUIDs (e.g. 36 dashes); siblings use `UUID.fromString(x).toString().equals(x)` (`FixtureActivity.java:17`, `MediaFixtureActivity.java:27`). | Use the canonical UUID round-trip for consistency. | None |
| 3 | 44 | B1 (specified) | `catch(IOException denied){}` on connect — the refusal *is* the measured outcome (`connected=false`). | Keep; add `// refusal is the expected result` is already implied by the variable name; fine as is. | — |
| 4 | 22-54 | D8 | Dense lines (47-48 write ten parcel fields on two lines). | Formatter; one `out.write…` per line so the wire order (read positionally by the test) is reviewable. | None (order must not change). |
| 5 | 19 | C6 | `ALPHA="ai.alphacompute.alphaphone"` — app id literal again. | Separate APK; keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `ALPHA` | const | 19 | app id in `app.config.json`, many tests | Keep local |
| UUID check (regex) | idiom | 58 | `FixtureActivity.java:17`, `MediaFixtureActivity.java:27` | Keep local, align idiom |

## Proposed end state
Same behaviour and parcel layout, `BuildConfig` clause gone, UUID check canonical, formatted (~65 physical lines).

## Verification
Resident CI (`.github/workflows/resident-android.yml`, `scripts/ci/resident-native.py` private-peer phase running `PrivateResidentSocketInstrumentedTest#ordinaryOtherUidCannotReachPrivateEndpoint`); `node --test test/resident-native-ci-admission.test.mjs`.
