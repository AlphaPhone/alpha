# specs/quint/native/NativeCaptureFrames.qnt
- Lines: 77 | Kind: Quint model (live, `native` manifest; upstream-only sources) | Verdict: KEEP (upstream lane)
- Covers: the real `LiveVoiceCapture` loop's input→packet relation: VAD thresholds, 10-window pre-roll, stop-tail flush, read failure drops unpublished tail, terminal buffers zeroed. Duplicates: complements `NativeLiveCapture` (admission/lifecycle) and `VadSegmentation`; no twin. Callers/importers: `native/manifest.json` (4 tests, 3 invariants, no `bounds`), harness `refinement/native/capture-frames.mjs` (reuses `live-capture.mjs` and `live-capture-platform.mjs`), `test/quint-capture-frames.test.mjs`, native aggregate; README `:336`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | P6 | All five sources are `vendor/eliza/plugins/plugin-local-inference/.../voice/*.java` (§2.9). | Upstream-pin lane only; upstream move listed as D14 follow-up. | L |
| 2 | 26-30, 61 | - | `PacketAgreement` compares the observed packets with a pure fold of the input history: a strong, compact oracle. | None. | - |
| 3 | test wrapper | T4 | Run twice. | One runner. | L |

## Proposed end state
Unchanged; runs only when the upstream pin or its harness changes.
