# specs/quint/native/NativeLiveCapture.qnt
- Lines: 180 | Kind: Quint model (live, `native` manifest; mostly upstream sources) | Verdict: KEEP (upstream lane)
- Covers: `LocalSpeechBridgePlugin` + `LiveCaptureController` admission: start only while foreground, current epoch and not in a call; host pause retires the microphone except a pending permission reservation; discarded tails emit nothing; call interruption carries its cause. Duplicates: complements `NativeCaptureFrames` (loop I/O), `SharedRecordingAdmission` and `NativePipedCapture` (whose harnesses import `live-capture.mjs`). Callers/importers: `native/manifest.json` (12 tests, 7 invariants, no `bounds`), harness `refinement/native/live-capture.mjs` + `live-capture-platform.mjs` + `shared-recording.mjs`; also imported by `capture-frames.mjs`, `piped-capture.mjs`; `test/quint-live-capture.test.mjs`; native aggregate; README `:301`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | P6 | Sources are upstream `plugin-local-inference` voice classes plus consumer `android/upstream-native-sources.json` (staging manifest). | Lane: upstream pin + `android/upstream-native-sources.json`. | L |
| 2 | harness | - | `live-capture-platform.mjs:42-44` `.replace`s anchors in fixture stubs (Context, MediaRecorder, VoiceLatencyProbe stub), not product code. | None. | L |
| 3 | 8-9, 160-168 | D8 | Several lines exceed 200 characters (truncated in review); hard to read. | Prettier does not format Quint; wrap by hand when next edited. | L |
| 4 | test wrapper | T4 | Run twice. | One runner. | L |

## Proposed end state
Unchanged; upstream-pin lane.
