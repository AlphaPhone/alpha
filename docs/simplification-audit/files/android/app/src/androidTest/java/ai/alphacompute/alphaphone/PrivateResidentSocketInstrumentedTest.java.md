# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PrivateResidentSocketInstrumentedTest.java
- Lines: 94 | Role: proves an ordinary other-UID app (private-peer-fixture) cannot connect to the resident's filesystem socket path. | Verdict: KEEP
- Importers: none. Text/path pins: `scripts/ci/resident-native.py:59` phase tuple `('private-peer','PrivateResidentSocketInstrumentedTest','ordinaryOtherUidCannotReachPrivateEndpoint','privatePeerFixture','privatePeerRunId')`, run by `.github/workflows/resident-android.yml:519`. Peer service name `ai.alphacompute.alphaphone.peerfixture.PrivateSocketProbeService` pins `android/private-peer-fixture`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 22 | A7 (minor) | `static boolean denied(int,int)` is package-visible but has no caller outside this file (grep `\.denied(` in androidTest/test: 0). | Make it `private`. | none |
| 2 | 50 | D7 | Reflects into generated `ElizaAgentService.localSocketPath` (`setAccessible(true)`) to compare paths. | Keep (upstream class, no public accessor); note it pins an upstream private name. | low |
| 3 | 82-92 | C3 | Cleanup aggregation with `primary.addSuppressed` (same shape as 5+ files). | `TestCleanup` helper when introduced. | none |
| 4 | 44 | C3 | `runId.matches("[0-9a-f-]{36}")` inline UUID regex (catalogue C3 ID validators). | Shared `TestIds.uuid` only if a test util class is created; otherwise leave. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `mode(path,bits,socket)` | helper | 18-21 | none | keep |
| `denied` | helper | 22-25 | none | keep, private |
| `positive(server,path)` | helper | 26-39 | none | keep |

## Proposed end state
Unchanged behaviour; `denied` private, cleanup via shared helper if one is introduced. ~88 lines. This is a real
security boundary test run in CI; keep it.

## Verification
`python3 scripts/ci/resident-native.py` (phase `private-peer`) in `resident-android.yml`; needs `-PELIZA_DEV_ALLOW_TEST_MOCKS=1` debug build and the private-peer fixture APK.
