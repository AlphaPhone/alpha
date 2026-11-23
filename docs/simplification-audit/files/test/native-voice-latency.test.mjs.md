# test/native-voice-latency.test.mjs
- Lines: 225 | Kind: tooling (imports `scripts/native-voice-latency.ts` and `scripts/aggregate-voice-latency.ts`; one test spawns the CLI five times) plus one test of upstream JVM classes and source regexes | Verdict: KEEP, MOVE to `test/tooling/voice-latency.test.ts`; DELETE test at lines 145-170 and the v2 legacy-format case
- Covers: the release voice-latency aggregator measures last speech → audible playback, splits cold/warm p50/p95, never pools incompatible cohorts, never lets emulator/harness/debug/dirty trials qualify, keeps failures visible, fails closed on conflicting duplicates and enforces the 6 s ceiling and thermal rule; CLI exit codes. Duplicates: `test/diagnostics-export.test.mjs`, `test/voice-entry-timing.test.mjs` import the same aggregator for other formats. Callers/importers: `npm test` glob only; scripts used by `native-voice-latency-emulator.ts` (manual campaign, no CI caller).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 145-170 | T1, T5 | Runs upstream `VoiceLatencyTrialsTest` and regexes upstream `VoiceLatencyProbe`/`LiveVoiceCapture`/`AudioTrackSpeechOutput`/`LocalSpeechBridgePlugin` plus Alpha's `AlphaApplication`/androidTest text. | Delete; upstream follow-up. | Low |
| 2 | 186-209 | A1 | Legacy v2 export format (`legacyNativeTimingFormat`) still parsed only to be refused. | Owner question: drop v2 parsing in the script and this case. | Low |
| 3 | 119-143 | - | Spawns the CLI five times (a few hundred ms each). | Keep one pass and one failure exit code; the rest are already asserted on the library. | None |
| 4 | 21-118, 172-225 | - | Release-gating evidence rules; pure data, real module. | Keep; consolidate the mutation tables. | None |

## Proposed end state
`test/tooling/voice-latency.test.ts`: cohort/budget table, ineligible-cohort table, invalid-row table, failure/abandon
accounting, duplicate conflict, one CLI exit-code case. No source text, no upstream JVM.
