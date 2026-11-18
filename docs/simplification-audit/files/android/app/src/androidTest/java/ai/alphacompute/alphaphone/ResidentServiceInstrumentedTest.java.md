# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ResidentServiceInstrumentedTest.java
- Lines: 122 | Role: opt-in service-only resident test: verify packaged runtime hashes, start the resident, enroll an owner, chat once (traced to Cerebras), restart and prove owner/agent/history persist. | Verdict: SIMPLIFY
- Importers: none; uses `ResidentTestFixture` and `ResidentModelResponseContract`. Text/path pins: `scripts/android-resident-instrumentation.ts:2,24` (drives this class by default; proof file `files/resident-service-complete.json`); `scripts/owner/emulator-campaign-check.ts` (names the class). Not in `CLASS_REGISTRY` (campaign-only via `CAMPAIGN_RUNNERS`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24-31 | C3 | `nativeCall`/`request` = `ResidentEgressRedaction.call` and `ResidentTestFixture.nativeGet`. | One `ResidentTestFixture.call(...)`. | none |
| 2 | 79 | D8 | One ~1,400-character line holding the trajectory assertions, per-call diagnostics and the contract check. | Extract `assertCall(found,c,i)`; inline `ResidentTestFixture.validModelCall` (after merging the contract class). | none |
| 3 | 67-70 | D4 | Four one-line pass-throughs to `ResidentTestFixture` (`ownedChild`, `stopped`, `owner`, `agent`). | Call the fixture directly. | none |
| 4 | 85, 88, 97 | C6 | `"local-agent-provider:v1"` and `"qwen-3.8-27b"` literals (also in ResidentEgressRedaction). | `LocalAgentProviderAdmission.PROVIDER_SLOT`; one model constant. | none |
| 5 | 116 | B5 | Writes `resident-service-complete.json`; consumed by `scripts/android-resident-instrumentation.ts:24`. | Keep. | none |
| 6 | 90 | B3 (minor) | Hand-parses the ELF header of `libeliza_bun.so` (machine 183 = aarch64) after already checking its SHA-256 against the fixture. | Drop the header check; the hash pins the exact file. | low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `nativeCall` / `request` | helper | 24-31 | `ResidentEgressRedactionInstrumentedTest.java:44-50` | `ResidentTestFixture.call` |
| `startAndEnroll` | helper | 32-65 | readiness loop in `ResidentEgressRedaction :81-84` | readiness part to `ResidentTestFixture.awaitReady` |
| `trace` | helper | 72-82 | `ResidentEgressRedaction.recordedCalls` | shared trajectory reader in `ResidentTestFixture` |
| `history` | helper | 71 | none | keep |

## Proposed end state
Same campaign test; HTTP/readiness/trajectory plumbing and the response contract in `ResidentTestFixture`; dense assertion
line split; redundant ELF parse removed. ~110 lines.

## Verification
`ALPHA_RESIDENT_DISPOSABLE_EMULATOR=1 node scripts/android-resident-instrumentation.ts <app.apk> <androidTest.apk>` (ARM64, owner provider key fixture); `scripts/owner/emulator-campaign-check.ts`.
