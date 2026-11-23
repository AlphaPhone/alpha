# scripts/ci/check-changed-models.ts
- Lines: 115 | Kind: CI script (selects Quint models touched by a diff and runs `check-quint.ts` phases for each) | Verdict: SIMPLIFY (selection stays; receipts, re-hashing and per-model spawning go; selection moves into `check-quint.ts --changed-since=<base>`)
- Covers: PR-time symbolic checking of only the Quint models whose file, manifest entry, listed `sources`, upstream lock (for `vendor/eliza` sources) or imported models changed. Duplicates: `quint-model-check.yml:45` runs all models' `verify` on any `specs/quint/**` PR (P3); manifest reading and the family list duplicate `scripts/quint-lib.ts:43,58-96` (research/ci-and-formal.md:340-341). Callers/importers: `package.json:73` `quint:changed` -> `.github/workflows/browser.yml:134` (`formal` job; uploads `test-results/quint/changed-models/` at :140); test `test/quint-changed-models.test.mjs` (31 lines, imports `selectChangedModels`, `importedModelPaths`, `proofPhases`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-19, 59-62, 85-89, 95-101, 106-113 | B5 | `ChangedModelsReceipt`/`PhaseEvidence`, run UUID directories, per-input SHA-256 before and after the run ("Proof input changed during run"), and validation that each child's JSON evidence echoes the model hash. This is the only reader of `check-quint` receipts (research/scripts.md:150). | Rely on `check-quint`'s exit code. Delete receipts, `inputHashes`, `finalInputErrors`; then `check-quint.ts` can drop its receipt writing too. | Low. |
| 2 | 22, 27 | P1 | `checkerInputs` includes `package-lock.json`: every dependency bump re-verifies all ~379 models (hours). | Replace with "Quint/Apalache version changed" (read the version from the lock) or drop. | Low. |
| 3 | 20-21, 69-82 | C3 | Own family list, own manifest path list, own `Array.isArray(document)?document:document.models` and `sharedSources -> vendor/eliza/` mapping duplicate `quint-lib.ts`. | Export `modelFamilies` and `readModelFamily(family, text)` from `quint-lib.ts` and use them with `git show` text. | Low. |
| 4 | 91-94 | P3 | Spawns `check-quint.ts` once per model per phase (Apalache JVM start each time). | One `check-quint.ts <phase> --models=a,b,c` call per phase. | Low. |
| 5 | 64-66 | B3 | Validates the `--base` value by regex then `rev-parse`; the all-zero base (new branch) maps to the empty tree. Keep the zero-base case; `rev-parse --verify` alone suffices for the rest. | Simplify. | Low. |
| 6 | 53-55 | C3 | One of 14 hand-written arg parsers. | Use `node:util parseArgs`. | Low. |
| 7 | 41-45 | - | Regex import closure of `.qnt` files: legitimate (model files, not product text). Keep. | none | - |
| 8 | 28-31 | P1 | Selection by manifest `sources` makes hot product files (`connection-ui.tsx` 24 models, `model.js` 22, `main.tsx` 17) select large sets; ~2 h when touched (research/ci-and-formal.md §2.3). After stage F splits and T10 ports, manifests should list the module a model actually refines. | Manifest hygiene (formal chunk), not this script. | - |
| 9 | test | T3 | `test/quint-changed-models.test.mjs` is a pure unit test of selection. | Keep as the one tooling test of CI selection (it gates which proofs run) or merge into a `test/ci-selection.test.mjs` with `affected.ts` cases. | Low. |

## Proposed end state
`check-quint.ts` gains `--changed-since=<rev>`, which uses `selectChangedModels` + `importedModelPaths` (moved into `quint-lib.ts`) and checks the selected models in one invocation per phase. This file is deleted; `quint:changed` becomes `node scripts/check-quint.ts verify --changed-since=$BASE` (plus temporal/compare). `quint-model-check.yml` and the `browser.yml` formal job become one job (P3).
