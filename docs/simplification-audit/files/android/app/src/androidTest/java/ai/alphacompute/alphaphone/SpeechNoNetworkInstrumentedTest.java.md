# android/app/src/androidTest/java/ai/alphacompute/alphaphone/SpeechNoNetworkInstrumentedTest.java
- Lines: 165 | Role: with a validated network up, runs the packaged on-device ASR+TTS (`LocalSpeechEngine` over `SessionSpeech`) and proves zero egress via TrafficStats, a /proc/self/fd socket census and StrictMode; idle baseline first; writes `speech-no-network-evidence/result.json`. | Verdict: KEEP (small simplify)
- Importers: none. Registry `SpeechNoNetwork: { args: { localSpeech: "1" } }` (`scripts/android-instrumentation.ts:261`). Not in `FUSED_SPEECH_CLASSES` (`scripts/ci/emulator-suite.ts:35`), so no CI lane runs it. Text/path pins: none. The evidence file `speech-no-network-evidence/result.json` has no reader in the repo (grep: 0 hits outside this file).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-4, 128-140 | T5 (partial) | The code under test is upstream (`ai.eliza.voice.LocalSpeechEngine`, `SessionSpeech`, `VoiceAssets`); the comment says "the engine AlphaVoiceCloudPlugin's submitLocal methods hold" but the test constructs it directly. The no-egress claim is a product promise (#413 / PRD privacy), so the device-level check is worth keeping. | Keep; ideally drive `AlphaVoiceCloud` submitLocal through the bridge so Alpha's wiring is under the census too (owner choice). | — |
| 2 | 107-109, 162 | B5 | Writes an evidence JSON to external files that nothing pulls (no script reads `speech-no-network-evidence`). | Delete the evidence file write, or have the runner pull it; assertion messages already embed `speech.json()`. | None. |
| 3 | 95, 97, 148 | — | `Assume.assumeNoException` for missing assets/engine: skip rather than pass — correct per AGENTS evidence classes. | Keep. | — |
| 4 | 69 | B1 | `catch(Exception closed){/* fd closed between list and readlink */}` | Keep (documented race). | None. |
| 5 | 5-6 | D8 | Import order mixes `ai.eliza` and static imports. | Formatter. | None. |
| 6 | — | P (CI) | Not run by any CI lane although it needs the same packaged bundle as the fused-speech lane. | Owner question: add to `FUSED_SPEECH_CLASSES` (needs network ON, unlike the others) or accept manual-only. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `sockets()` | helper | 67-71 | none | keep |
| `Window` | class | 73-88 | none | keep |

## Proposed end state
Unchanged logic, no unread evidence file, ~155 lines.

## Verification
`node scripts/android-instrumentation.ts --classes SpeechNoNetwork` with staged voice outputs (`npm run android:build:local`), networking ON.
