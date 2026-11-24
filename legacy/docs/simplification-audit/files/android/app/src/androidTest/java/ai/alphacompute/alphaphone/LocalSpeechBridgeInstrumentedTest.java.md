# android/app/src/androidTest/java/ai/alphacompute/alphaphone/LocalSpeechBridgeInstrumentedTest.java
- Lines: 73 | Role: offline `AlphaVoiceCloud` bridge: local transcription of a fixture recording, local synthesis and playback events, stop, and cancellation draining a queued request. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/android-instrumentation.ts:259` (arg `localSpeechBridge`); `scripts/ci/emulator-suite.ts:35` (`FUSED_SPEECH_CLASSES`); `test/ci-emulator-evidence.test.mjs:241-243`; asset `speech-fixture/0-recorder.m4a`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 30-31, 48-49, 60 | T6 | Reflection into private fields of upstream `ai.eliza.voice.LocalSpeechBridgePlugin` (`"gate"`, `"capture"`, `"workers"`) and of the capture object (`"file"`, `"id"`, `"durationMs"`) to inject a recording and block the worker pool. Breaks silently on any upstream rename; it tests upstream internals. | Keep transcription/synthesis/playback (L47-57) but feed the fixture through a public recorder path or the test-mocks recording hook; move the drain-ordering check (L58-69) upstream next to `SpeechRequestGate`. | Medium (loses device-level drain check here) |
| 2 | 23-28 | C3 | Private `until`/`call` copies. | Shared driver. | Low |
| 3 | 37 | C3 | Manual 8 KiB copy loop for an asset (the suite already relies on API-33 `InputStream.readAllBytes`, e.g. IsolatedPdfInstrumentedTest:33). | `in.transferTo(out)`. | None |
| 4 | 38-39 | D8 | Mis-indented block (scenario `try` and the comment at the outer level). | Reformat when touched. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `plugin()` | helper | 29 | 33 files | `WebViewTestDriver.plugin` |
| `field(Class,String)` | helper | 30 | reflective field reads in `MapsInstrumentedTest`, `MapsBackgroundNavigationInstrumentedTest`, `MapsRegionalInstrumentedTest`, `NoteRecorderInstrumentedTest` | avoid; if kept, `TestReflection.field` |
| `ready(id)` | helper | 32 | none | keep |

## Proposed end state
Bridge transcription, synthesis, play/stop through public plugin methods only; drain ordering moved upstream. About 55 lines.

## Verification
`scripts/ci/emulator-suite.ts` fused-speech suite (`-e localSpeechBridge 1`) with staged voice outputs and networking off.
