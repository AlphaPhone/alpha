# scripts/native-voice-latency.ts
- Lines: 235 | Kind: evidence tooling (validates and aggregates native voice timing exports into acceptance cohorts) | Verdict: SIMPLIFY (keep)
- Covers: the acceptance arithmetic for issue #395 (last user audio to first audible response): row validation at the file trust boundary, de-duplication of conflicting trial ids, cohort classes (acceptance-candidate / diagnostic / emulator), percentile statistics, sufficiency and the 6 s budget. Duplicates: renderer `apps/app/src/runtime/diagnostics-export.ts:61-62` carries its own allowlists for the same v3 format ("the aggregator's allowlists"). Callers/importers: `scripts/aggregate-voice-latency.ts:36` (which `native-voice-latency-emulator.ts` and `npm`-less manual runs use), `test/native-voice-latency.test.mjs`, `test/diagnostics-export.test.mjs`; named in comments of `NativeVoiceLatencyInstrumentedTest.java:53`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-18, 35-36, 38, 78, 83, 150 | A1 | Accepts the earlier `alpha-native-voice-timing-v2` format (`legacyNativeTimingFormat`, `legacyMarks`, `nativeTimingFormats`). Every producer emits v3 (`AlphaApplication.java:24`, `diagnostics-export.ts:62`, the harness); the package was renamed with empty private data, and v2 rows could only ever be diagnostic. | Delete v2 support; `nativeTimingFormats` becomes the single v3 format; update `aggregate-voice-latency.ts:116-117` and drop the v2 cases in `test/native-voice-latency.test.mjs:203-207`. | Low: old evidence folders stay in git; they were diagnostic-only. |
| 2 | 72-107 | B3 | Hand validator for rows read from export files: correct, this is the trust boundary (files from devices). | Keep. | — |
| 3 | 42, 50 | C3 | UUID regex and SHA-256/commit regexes repeated across scripts. | Import from shared `scripts/lib/patterns.ts` if created; otherwise leave. | None |
| 4 | 1-33 | A8 | 33-line header partly narrates history ("Earlier … v2 exports still parse"). | Trim with finding 1. | None |
| 5 | 144-235 | D9 | `aggregateNativeVoice` is 90 lines building one large object; readable, but cohort construction could be a named function. | Extract `cohortSummary(rows)` when touching. | None |

## Proposed end state
v3-only validator and aggregator (~200 lines), same output shape for v3 inputs. It is the specification of the voice latency acceptance rule, so its focused test (`test/native-voice-latency.test.mjs`) is one of the few unit-level tests worth keeping under T3's "risky pure algorithm" exception; fold it into a voice-evidence integration file if the test reviewers prefer.
