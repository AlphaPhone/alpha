# android/app/src/androidTest/java/ai/alphacompute/alphaphone/PairedAsrInstrumentedTest.java
- Lines: 59 | Role: paired-agent ASR (`AlphaVoiceCloud.pairedTranscriptionStatus` / `transcribePairedRecording`) against a loopback HTTP fixture, with the real AAC decoder and a recording injected by reflection | Verdict: DELETE with the P15 owner decision (paired agents); otherwise SIMPLIFY/MERGE with PairedVoice
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:226` (`PairedAsr: { requiresTestMocksBuild: true }`) → `test/android-instrumentation-runner.test.mjs:143-160` requires the text `BuildConfig.ELIZA_DEV_ALLOW_TEST_MOCKS` here (l.39). Asset `paired-whisper-fixture.m4a` (androidTest assets) is shared with `PairedAsrLive`, `CombinedAgent`, `CombinedAgentRestart`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole file | A3 / P15 | Exercises `remote:<origin>` paired-agent speech. PRD `docs/prd.md:11,17`: no hosted-agent pairing. Renderer caller is `apps/app/src/runtime/paired-voice.ts:8-11`. | If pairing is removed: delete this file, `PairedAsr` registry entry, the native `transcribePairedRecording`/`pairedTranscriptionStatus` (`AlphaVoiceCloudPlugin`), `PairedAgentCredential`, `PairedSpeechContract`, and `paired-voice.ts`. If pairing stays as a developer surface: keep behind test mocks (it already is). | Owner decision. |
| 2 | 25-37 | C5 | Loopback `Fixture` (ServerSocket, header read, content-length body, canned responses) is a near-verbatim copy of `PairedVoiceInstrumentedTest.java:26-38`; only the response table and count differ. | One `LoopbackHttpFixture(List<Response>)` in androidTest. | Low. |
| 3 | 31, 33 | A7 | `requestId` parsed (l.31) and never used; `status`/`type` (l.33) are constants. `Location: https://example.com/` header on every response (l.34) has no purpose here (no redirect case in this test). | Delete l.31, inline l.33, drop the header. | None. |
| 4 | 21-24 | C3 | `call(expression)` bridge await (8 copies, see NotificationAccessTestDriver). | `WebViewTestDriver.nativeCall`. | None. |
| 5 | 44 | C3 / B2 | Poll for `window.Capacitor?.Plugins?.AlphaVoiceCloud` — plugin always registered; same loop in PairedVoice:42. | Delete; use `AppNavigation.liveMode()`. | Low. |
| 6 | 48 | C3 / D8 | 600-character reflection into upstream `LocalSpeechBridgePlugin.capture` / `LocalVoiceRecording` private fields; same injection in `PairedAsrLiveInstrumentedTest.java:47`, `PairedVoiceLiveInstrumentedTest.java:47`. Tests reach into upstream private state (research P20). | If kept: one `RecordingInjection.inject(file,id,durationMs)` helper; better, an upstream test-mocks recording source. | Medium: breaks when upstream renames fields. |
| 7 | 41 | C3 | Manual 8 KiB stream copy of an asset to a file; `InputStream.transferTo` / `Files.copy` does it. Same in PairedAsrLive:33. | `Files.copy(input, audio.toPath(), REPLACE_EXISTING)`. | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `call` | helper | 21-24 | PairedVoice:21-24 (identical), 6 more | `WebViewTestDriver.nativeCall` |
| `Fixture` | class | 25-37 | PairedVoice:26-38 | `LoopbackHttpFixture` |

## Proposed end state
Deleted (with P15). If kept: ~35 lines using a shared loopback fixture, shared bridge await and a shared recording
injector, merged into one `PairedSpeechInstrumentedTest` with PairedVoice.

## Verification
`npm run test:android:instrumentation -- --test-mocks --classes PairedAsr`; host `node --test test/android-instrumentation-runner.test.mjs`.
Renderer: `test/browser/*paired*` specs if any remain.
