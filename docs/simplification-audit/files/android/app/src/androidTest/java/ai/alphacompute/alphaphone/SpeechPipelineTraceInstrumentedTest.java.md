# android/app/src/androidTest/java/ai/alphacompute/alphaphone/SpeechPipelineTraceInstrumentedTest.java
- Lines: 71 | Role: opt-in diagnostic that synthesizes a fixed 8-sentence corpus three times with upstream Paradee/SessionSpeech, transcribes it back and writes WAVs + `comparison.json` with word edit distances. Explicitly "not acceptance evidence". | Verdict: DELETE
- Importers: none. Listed in `NOT_RUN_BY_A_RUNNER` (`scripts/android-instrumentation.ts:341`: "diagnostic acquisition for the on-device speech failure, explicitly not acceptance evidence"). Arg `speechPipelineTrace` is set by nothing (grep). Text/path pins: the `NOT_RUN_BY_A_RUNNER` entry (the runner test `test/android-instrumentation-runner.test.mjs:201-203` fails if the entry outlives the class).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-71 | A7 / T9 | No runner executes it; it only exercises upstream `ai.eliza.voice` (`ParadeeVoice`, `SessionSpeech`, `VoiceAssets`); output is a local diagnostic directory nobody collects. Research delete-candidate list agrees. | Delete the file and the `SpeechPipelineTrace` entry in `NOT_RUN_BY_A_RUNNER` in the same commit. | None for product; the investigation it served can be restored from git. |
| 2 | 3-6 | NEW (dead imports) | `import ai.eliza.voice.*;` after three explicit imports from the same package. | (moot) | — |
| 3 | 60 | B4 | `prepared=input` — a second name for the same string, written to the report twice. | (moot) | — |
| 4 | 34 | C3 | SHA-256 hex copy. | (moot) | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `edits` (word Levenshtein) | helper | 33 | `LocalSpeechInstrumentedTest` may score transcripts by contained words instead (not verified) | delete |
| `resample` | helper | 36 | upstream `LocalSpeechEngine` handles 16 kHz input | delete |
| `sha` | helper | 34 | ~30 copies | delete |

## Proposed end state
File deleted (−71 lines) plus one line in `scripts/android-instrumentation.ts`.

## Verification
`node --test test/android-instrumentation-runner.test.mjs` (reachability/stale-list check); androidTest APK compile in `npm run android:build:local`.
