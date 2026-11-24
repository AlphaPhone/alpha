# specs/quint/refinement/native/piped-capture.mjs
- Lines: 24 | Kind: Quint refinement driver (host JVM; real shared bridge, `LiveCaptureController`, `LiveVoiceCapture`, `LiveSegmentPipe` over controlled audio and provider ports) | Verdict: KEEP
- Covers: Piped live capture coordinator: normal/final transcripts, ASR and pipe errors, owner batch/warm paths, warm failure, pause/destroy during warm and live, call open, stop discard, unconfirmed stop. Model `NativePipedCapture`. Duplicates: none (internal pipe partitions are `asr-pipe.mjs`). Callers/importers: `native/index.mjs:27,190`, `test/quint-piped-capture.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13 | B5 | Hashes nine harness/platform modules (`note-bridge-platform.mjs`, `shared-recording*.mjs`, …) as "sources" though only `liveCaptureSources(platform)` is compiled. | Keep compiled files + model only. | None |
| 2 | 12 | — | Compile set comes from `live-capture.mjs` (whole classes). Good shape. | Keep. | — |
| 3 | scope | §2.9 | Mostly upstream voice code; lane can be path-filtered to upstream/patch changes plus `AlphaVoiceCloudPlugin.java`. | CI filter. | None |

## Proposed end state
Unchanged apart from a short `sources` list.
