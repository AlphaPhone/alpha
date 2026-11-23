# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PairedVoiceInstrumentedTest.java
- Lines: 70 | Role: paired-agent TTS (`pairedVoiceStatus`, `synthesizePaired`, `play`) over a loopback HTTP fixture, rejecting wrong owner/expired/insecure/missing-session bindings, HTML and redirect responses | Verdict: DELETE with the P15 owner decision; otherwise MERGE with PairedAsr into one class
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:227` (`PairedVoice: { requiresTestMocksBuild: true }`) → runner test requires `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS` text (l.40).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | A3 / P15 | Paired-agent speech; PRD forbids hosted-agent pairing. | Delete with the paired stack (see PairedAsr report) or keep as a test-mocks developer surface. | Owner decision. |
| 2 | 26-38 | C5 | Loopback `Fixture` duplicates `PairedAsrInstrumentedTest.java:25-37`. | Shared `LoopbackHttpFixture`. | Low. |
| 3 | 21-24 | C3 | `call` identical to PairedAsr:21-24 except iteration count (200 vs 600). | Shared helper with a timeout parameter. | None. |
| 4 | 25 | KEEP | `wav()` synthesises a 16-bit PCM WAV; `PairedVoiceLiveInstrumentedTest.java:33` builds another WAV header inline. | One `TestAudio.wav(sampleRate, samples)` if both kept. | None. |
| 5 | 42 | B2 | Poll for `AlphaVoiceCloud` plugin presence. | Delete. | Low. |
| 6 | 61 | T8 | Fixed 80×50 ms loop for `playbackEnded`, then assert. | Use the shared `until`. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `call` | helper | 21-24 | PairedAsr:21-24 | `WebViewTestDriver.nativeCall` |
| `wav` | helper | 25 | PairedVoiceLive:33 (inline) | `TestAudio.wav` |
| `Fixture` | class | 26-38 | PairedAsr:25-37 | `LoopbackHttpFixture` |

## Proposed end state
Deleted with P15, or merged with PairedAsr into one ~70-line `PairedSpeechInstrumentedTest` (two @Test methods on one
shared loopback fixture).

## Verification
`npm run test:android:instrumentation -- --test-mocks --classes PairedVoice`.
