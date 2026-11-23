# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PairedVoiceLiveInstrumentedTest.java
- Lines: 66 | Role: opt-in live paired host TTS at `http://10.0.2.2:47844` through Notes Listen/Stop with an injected synthetic recording | Verdict: DELETE with P15; otherwise MERGE with PairedAsrLive
- Importers: none. Text/path pins: manual campaign `scripts/android-paired-speech-live.ts:28` (`gate: 'pairedVoiceLive'`), `CAMPAIGN_RUNNERS` in `scripts/android-instrumentation.ts:313`. Not run by CI or package.json.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | A3 / P15 | Live paired-agent speech; PRD forbids pairing. | Delete with paired stack and the campaign script. | Owner decision. |
| 2 | 21-65 | C5 / T4 | Near-verbatim twin of `PairedAsrLiveInstrumentedTest.java:21-66` (see that report, finding 2). | Merge if kept. | Low. |
| 3 | 33 | C3 | Inline 32 KB WAV header build; `PairedVoiceInstrumentedTest.wav()` (l.25) does the same. | `TestAudio.wav`. | None. |
| 4 | 40-41 | C3 | "Local development agent" connect routine (10 copies). | Shared helper or delete. | — |
| 5 | 23-26, 47 | C3 | Reflection into upstream `LocalSpeechBridgePlugin.capture` / `LocalVoiceRecording.events` (private upstream fields). | Shared injector or upstream test hook. | Medium. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `until`/`click`/`activity`/`voice`/`store`/`field` | helper | 21-26 | PairedAsrLive:21-26 (identical) | shared / delete |

## Proposed end state
Deleted with P15, or one merged Live class (~60 lines for both).

## Verification
`node scripts/android-paired-speech-live.ts voice` (manual).
