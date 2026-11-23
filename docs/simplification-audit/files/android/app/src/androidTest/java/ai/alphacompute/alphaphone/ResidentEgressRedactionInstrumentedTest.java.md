# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ResidentEgressRedactionInstrumentedTest.java
- Lines: 112 | Role: with secret/PII swap on, a resident turn completes and the recorded provider requests carry placeholders, never raw identifiers or seven sensitive content classes. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/android-resident-instrumentation.ts:23-24` (default `RESIDENT_TEST` class name and proof file `files/resident-redaction-complete.json`); `scripts/android-instrumentation.ts:289` (campaign entry). Fixture input `resident-provider-input.json` and gate `residentService=1` are shared with `ResidentServiceInstrumentedTest`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 43 | C3 | `sha256(String)` = `ResidentTestFixture.hash` (`:18`) on UTF-8 bytes. | Use `ResidentTestFixture.hash`. | none |
| 2 | 44-50 | C3 | `call(path,method,body)` = `ResidentServiceInstrumentedTest.nativeCall` (`:24-30`) and `ResidentTestFixture.nativeGet` (`:26`). | One `ResidentTestFixture.call(path,method,body,bearer)`. | none |
| 3 | 81-84 | C3 | Readiness loop (`localAgentToken` then `/api/auth/status` with `catch(Exception e){status=null;}`) duplicates `ResidentService.startAndEnroll` (`:34-48`). | `ResidentTestFixture.awaitReady(context,bearer)`. | none |
| 4 | 56-71 | C3 | `recordedCalls(room)` trajectory polling is a sibling of `ResidentService.trace` (`:72-82`). | Shared `ResidentTestFixture.trajectories(room)`; each test keeps its own assertions. | low |
| 5 | 77, 97 | C6 | `"local-agent-provider:v1"` literal (13x in main per research P6) and `"qwen-3.8-27b"` duplicated in ResidentService. | Use `LocalAgentProviderAdmission.PROVIDER_SLOT`; one model constant in `ResidentTestFixture`. | none |
| 6 | 83 | B1 | `catch(Exception e){status=null;}` swallows every failure during readiness. | Catch only the "not ready" `IOException`/`JSONException` (as ResidentService does). | low |
| 7 | 108 | B5 | Writes `resident-redaction-complete.json` proof. Read by `scripts/android-resident-instrumentation.ts:24`. | Keep (it has a consumer). | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `RAW` / `CLASSES` | const | 31-41 | none | keep |
| `sha256` | helper | 43 | `ResidentTestFixture.java:18` | delete |
| `call` | helper | 44-50 | `ResidentServiceInstrumentedTest.java:24-30`, `ResidentTestFixture.java:26` | `ResidentTestFixture` |
| `recordedCalls` | helper | 56-71 | `ResidentServiceInstrumentedTest.java:72-82` | `ResidentTestFixture` |

## Proposed end state
Same campaign test using `ResidentTestFixture` for HTTP, readiness, hashing and trajectory reads. ~100 lines.

## Verification
`ALPHA_RESIDENT_DISPOSABLE_EMULATOR=1 node scripts/android-resident-instrumentation.ts <app.apk> <androidTest.apk>` with `RESIDENT_TEST` = this class (ARM64, owner provider key fixture).
