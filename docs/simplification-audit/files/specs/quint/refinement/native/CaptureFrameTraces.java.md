# specs/quint/refinement/native/CaptureFrameTraces.java
- Lines: 102 | Kind: Quint refinement driver (host-JVM; real upstream `ai.eliza.voice.LiveVoiceCapture` loop with PCM source, VAD detector and cleanup ports; `android.util.Base64` stub written by `capture-frames.mjs`) | Verdict: KEEP; delete the dead `probe-cleanup` mode; share the campaign runner
- Covers: live voice capture framing: preroll, speech edges, close edge at threshold, middle reset, non-finite and missing VAD probabilities, partial reads, read failure, source/detector close failures, interrupt, and that PCM/VAD/encoded buffers are zeroed. Duplicates: none. Callers: `native/capture-frames.mjs:12-16`; test via the native family (`NativeCaptureFrames`, `specs/quint/native/manifest.json:1537`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 77-80 | A7 | `probe-cleanup` mode prints a non-trace JSON; `git grep probe-cleanup` hits only this line — nothing passes it. | Delete the branch. | None |
| 2 | 95-101 | C5 | Same one-JVM-per-scenario campaign loop as `AsrPipeTraces.java:185-191`. | Shared helper in `Trace.java` or rely on `javaTraceCampaign`. | Low |
| 3 | 50 | D8 | 300+ character `Trace.fields` line. | Format when touched. | None |
| 4 | scope | — | Models upstream voice capture shipped in this APK (patched). | Keep; upstream follow-up candidate (D14). | — |

## Proposed end state
~95 lines, no `probe-cleanup`, shared per-scenario runner, formatted.
