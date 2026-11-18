# specs/quint/refinement/native/forward-replays.mjs
- Lines: 84 | Kind: aggregate adapter (wraps nine per-model ITF replays as aggregate campaigns, re-asserting their bounds) | Verdict: DELETE (with the native aggregate)
- Covers: no behaviour of its own. Re-runs `SpeechCleanupLatch`, `RendererSpeechChunk`, `NativeStreamBridge`, `NativeMapsLocation`, `VideoRecorder`, `VideoEditReview`, `ResidentStartCancel`, `HomeInstanceHandoff`, `RendererBackgroundRebuild` inside `runNativeRefinement` and writes an `observedReplay` receipt. Duplicates: every one of the nine has its own test that runs the same replay with the same bounds — `test/quint-speech-cleanup-latch`, `-renderer-speech-chunk`, `-native-stream-bridge`, `-native-maps-location`, `-video-recorder`, `-video-edit-review`, `-resident-start-cancel`, `-home-instance-handoff`, `-renderer-background-rebuild` (`.test.mjs`). Callers/importers: `index.mjs:69,93` only (`services/index.mjs` imports a different `services/forward-replays.mjs`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-36, 74-84 | T4 | Each replay (several are 400-600 traces, multi-minute) runs twice per verify: once in its test, once here. | Delete; the per-model tests are the runners. | None |
| 2 | 41-72 | T4 / B5 | `owningAssertions` copies the per-test bounds (64 traces, `reached.length===6`, step minima…) into a second place; any change must be edited twice. | Delete with the file; the tests keep their own bounds. | None |
| 3 | 1-2, 78-81 | A8 / B5 | Header and assumption prose describe evidence ceremony ("without replacing their … oracles with summary-counter claims"). | Gone with the file. | None |
| 4 | — | owner question | `observedReplay` receipts for these models are written only here. If anything consumes `test-results/quint-refinement` receipts (no consumer found in `scripts/` or `.github/`), it loses these nine. | Confirm no consumer, then delete. | Low |

## Proposed end state
File removed. The nine models keep exactly one runner each (their `test/quint-*.test.mjs`).
