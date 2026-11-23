# test/quint-asr-pipe.test.mjs
- Lines: 14 | Kind: Quint replay wrapper (model `NativeAsrPipe`, driver `specs/quint/refinement/native/asr-pipe.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model); delete this file
- Covers: the native `LiveSegmentPipe` preserves cutoff, owner retirement and terminal futures. Product code: `LiveSegmentPipe.java` as staged from upstream with Alpha patches (`current-sources.mjs`, `nativePatchInputs`); model live (in `specs/quint/native/manifest.json`). Duplicates: the same campaign runs again in `runNativeRefinement()` (`specs/quint/refinement/native/index.mjs`). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | T4/P3 | Thin wrapper over `asr-pipe.mjs`; the campaign also runs in the native aggregate, so `npm test` replays it twice. | Delete; `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model) runs it once. | Low |
| 2 | asserts | P8/B5 | Magic counts and receipt flags: `traces===asrPipeScenarios.length` (tautology), `actions.*>0`; `inputsUnchanged`/`driverInputsBound` are receipt ceremony. | Runner asserts `passed` only; counts belong in the driver receipt if anywhere. | Low |
| 3 | driver | T10 | Driver tie (grep of `specs/quint/refinement/native/asr-pipe.mjs`): javac-compiles the real Java on the host JVM (good tie). | No change needed for the tie. | Low |
| 4 | all | P5 | The compiled class is upstream code (plugin-local-inference) with Alpha patches; research P5 notes upstream already ships `LiveSegmentPipeTest`. | Keep while Alpha patches it; list as an upstream follow-up (D14). | Low |

## Proposed end state
File deleted. `NativeAsrPipe` stays a live model and its campaign runs once, as one entry of `test/quint-refinement.test.mjs` (one manifest-driven runner, one `test()` per model).
