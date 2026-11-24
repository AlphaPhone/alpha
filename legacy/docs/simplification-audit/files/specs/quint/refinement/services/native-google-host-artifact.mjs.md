# specs/quint/refinement/services/native-google-host-artifact.mjs
- Lines: 60 | Kind: Quint refinement wrapper (spawns the probe in an isolated scratch HOME/TMPDIR, checks traces) | Verdict: KEEP, SIMPLIFY
- Covers: `NativeGoogleHostArtifact` (live, `specs/quint/services/manifest.json:2304`): the build step that compiles the native Google host into the workflow-worker artifact (`scripts/native-google-host-artifact.ts`, run by `agent:build-workflow-worker` in `android:build:local`) keeps the previous exact module/receipt pair on every refusal and readback rejects drifted bytes. Duplicates: none for the campaign; the same campaign is run by `test/quint-native-google-host-artifact.test.mjs` and by the services aggregate (`services/index.mjs:81` via `test/quint-services-refinement.test.mjs`) (T4). Callers/importers: `services/index.mjs:50`, `test/quint-native-google-host-artifact.test.mjs` (both exports).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 38-51 | B5 / T10 | Hand-maintained input list of 13 paths plus `coreStateReceipt` hashes, then asserts the captured hashes equal the core receipt. This is file pinning (acceptable), but it duplicates the `productFiles` list in the probe (`-probe.mjs:36-41`) and must be edited whenever a script is renamed. | Export one `inputs` list from the probe (or derive from esbuild metafile of the compiler port) and use it in both. | Low |
| 2 | 13-31 | C3 | Private scratch/env spawn helper; the same isolated-git spawn block exists in `reviewed-workflow-launcher.mjs:35-56` and `combined-agent-launcher.mjs`. | Move a `runIsolatedProbe(probe, args, {timeout})` helper to `refinement/support.mjs`. | Low |
| 3 | 33-35 | T5 | `checkNativeGoogleHostLoaderCompatibility` is an env-gated (`ALPHA_QUINT_BUN`) Bun loader check, not a model refinement; the host-test review moves it to `test/tooling/agent-build.test.mjs`. | Keep the export; it can stay here as the probe owner. | — |
| 4 | 53-59 | — | Assumptions text is a fixed prose receipt; fine. | — | — |

## Proposed end state
Wrapper of ~40 lines: one shared isolated-probe spawn helper, input list imported from the probe, one `test()` in the
manifest-driven Quint runner (`test/quint/refinement.test.mjs`) and not also in the services aggregate. Model and
harness stay live as long as the native Google host is built into the worker artifact.
