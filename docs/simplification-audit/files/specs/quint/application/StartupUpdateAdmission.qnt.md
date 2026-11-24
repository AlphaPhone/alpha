# specs/quint/application/StartupUpdateAdmission.qnt
- Lines: 84 | Kind: Quint model of shared upstream code (live: manifest, 4 scenarios, 3 invariants, bounds 1000/80/4) | Verdict: KEEP model; PORT harness; owner question on upstream ownership
- Covers: the startup mount hold for an in-progress app update (`holdAppUpdateStartup` in `upstream renderer: state/app-update-gate.ts`, consumed at `main.tsx:9,367`): exact native bridge, release only on a matching terminal or idle, single-flight Continue. Duplicates: `refinement/native/update-barrier.mjs:79` says MountedUpdateAdmission and this model "check the patched renderer request shapes separately" (adjacent, not identical). Callers/importers: manifest; harness `refinement/application/startup-update-admission.mjs` (176); per-model `test/quint-startup-update-admission.test.mjs` (10) and aggregate `index.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness 131-149 | T10 / B5 | Harness hashes the `.eliza` copy against `vendor/eliza` and `.source.json` (three sha256 asserts), asserts the absence of a retired `appUpdateResumePatch` receipt (A8 tombstone), then evals the file after inserting `globalThis.inspect` at the literal marker `'  let pending: Activation | undefined;\n  let acknowledged: string | undefined;'` and stripping `export`. | PORT: `tsImport` the prepared `upstream renderer: state/app-update-gate.ts` and observe `pending/acknowledged` through public behaviour (panel, continue calls, release); if internal state is needed, request an upstream test export (D14 follow-up, not here). Drop the hash and tombstone asserts; `prepare-client-features` already checks the projection. | Medium |
| 2 | all | P6 | The modelled code is upstream; this repo only consumes it. | Owner question: keep here as the consumer's contract, or move model upstream with the code (D14). Until answered, KEEP. | Low |
| 3 | 65-68 | — | `state.ready.subseteq(Activations)` in `safety` is a type check; fine. | None. | — |
| 4 | test | T4 | Runs per-model and in the aggregate. | Run once. | Low |

## Proposed end state
Model unchanged. Harness imports the prepared upstream module, drives it with the same four traces and reads only public effects; no hashing, no text marker, no tombstone assert. One runner.
