# test/quint-capture-frames.test.mjs
- Lines: 13 | Kind: Quint replay wrapper (model `NativeCaptureFrames`, driver `specs/quint/refinement/native/capture-frames.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: the native capture loop keeps pre-roll, packet order and zeroes terminal buffers. Product code: native capture Java (staged, with `android/util/Base64.java` stub); model live (in `specs/quint/native/manifest.json`). Duplicates: the same campaign runs again in `runNativeRefinement()` (`specs/quint/refinement/native/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `capture-frames.mjs`; the campaign also runs in the native aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===scenarios.length` (tautology), 2 `actions.*>0`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/native/capture-frames.mjs`): javac on host JVM. | No change needed for the tie. | Low |

## Proposed end state
File deleted. `NativeCaptureFrames` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
