# specs/quint/refinement/native/speech-warmup.mjs
- Lines: 22 | Kind: Quint refinement harness (Java, whole upstream classes) | Verdict: KEEP (SIMPLIFY)
- Covers: model `NativeSpeechWarmup` (live) — upstream `SpeechOutputWarmup` 15 s deadline, open/play/write/release faults. Upstream-only. Duplicates: `test/quint-speech-warmup.test.mjs` (T4). Callers/importers: `index.mjs`, that test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-9 | – (efficiency) | Builds the full `sharedRecordingPlatform()` (which builds note-recording and note-bridge platforms, ~60 generated files) to use one stub, `AudioTrackSpeechOutput.java`. | Take that single stub from the shared support module. Drops three `*-platform.mjs` from `sources`. | L |
| 2 | 12-20 | D8 | `try` block body is not indented; minified style. | Reformat when touched. | L |
| 3 | 22 | A7 | Unused CLI entry. | Delete. | L |

## Proposed end state
~15 lines: compile the five upstream voice classes + one stub; upstream-lock lane.
