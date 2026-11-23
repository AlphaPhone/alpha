# specs/quint/refinement/native/capture-frames.mjs
- Lines: 25 | Kind: Quint refinement driver (Node; reuses the live-capture platform and source list, writes one extra `android.util.Base64` port, runs `CaptureFrameTraces.java` in campaign mode) | Verdict: KEEP
- Covers: model `NativeCaptureFrames`: real `LiveVoiceCapture` loop, `LiveVadGate` and `LiveCaptureResource`: pre-roll, tails, resets, non-finite/missing VAD probability, partial reads, read/close failures, interruption. 13 scenarios. Duplicates: `test/quint-capture-frames.test.mjs` (T4). Callers: `index.mjs:28`, that test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 12 | C5 | Writes a `Base64` stub into the shared platform directory at run time, overriding whatever `liveCapturePlatform` put there. | Add a hook parameter to `liveCapturePlatform` (or a checked-in port) instead of overwriting a generated file. | Low |
| 2 | 14 | B5 | Receipt `sources` lists six platform modules by hand. | Shared helper. | Low |
| 3 | 16 | C5 | `campaign` self-spawn mode (see `VoiceDraftTraces` report). | Use `javaTraceCampaign`. | Low |

## Proposed end state
Unchanged campaign; Base64 port supplied through the platform; launched by the shared runner.
