# scripts/quint-lib.ts
- Lines: 252 | Kind: formal tooling library | Verdict: KEEP, SIMPLIFY (split; move source enumeration to `specs/quint/refinement/`)
- Covers: loads and validates the four Quint manifests, parses checker output (counterexample, missing scenarios), retries silent SIGSEGV/SIGILL, computes bounds, and enumerates product/shared source paths for conformance hashing. Duplicates: `filesWithin` walker twins `regular-files.ts` and ~8 `walk()` copies; `readJson`, `sha256` twins. Callers/importers: `check-quint.ts`, `check-quint-refinement.ts`, `check-lemma.ts` (only `repositoryRoot`, `sha256`), `ci/check-changed-models.ts`, `ci/affected.ts` (path); quint-model-check.yml; harnesses `refinement/check-traces.mjs` (`runQuintChecker`), `composition/{index,controllers}.mjs` and `application/shell-coordinator.mjs` (`sourcePaths`), `native/index.mjs` (`loadModels`), five live harnesses and ten `legacy/*` harnesses (`filesWithin`, `sha256`, `repositoryRoot`); tests `quint-checker.test.mjs`, `quint-conformance.test.mjs`, `lemma-checker.test.mjs` (copies this file into a temp repo), `lemma-check.test.mjs`, `quint-services-refinement.test.mjs`, `quint-tla-inventory.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-39, 112-152 | D1/D11 | Product source inventory (`sourceRoots`, 60-entry `runtimeScriptPaths`, `runtimeAssetPaths`, `sharedSourcePaths`, `sourcePaths`) is not checker logic; only refinement harnesses consume it. | Move to `specs/quint/refinement/sources.mjs`. | low |
| 2 | 10-38 | T10/A7 | Hand list of script paths; includes `removed-profile-flags.ts` (A8, slated for deletion) and the `start-*` launchers slated for merging; every script move breaks Quint conformance. All 60 paths exist today. | Replace with `scripts/**/*.{ts,py}` excluding `test-*`/`owner/` (or the import closure of the listed entry points). | medium (conformance hashes change once) |
| 3 | 43, 227 | P6 | `legacy` family in `modelFamilies` and the path regex. | Remove when `specs/quint/legacy` is retired. | low |
| 4 | 75, 238-244 | T10 | `symbols` manifest entries pin names by regex in product source (1,060 pins across manifests). | Drop symbol pins; keep file pins (`sources`). | medium (manifest edit across families) |
| 5 | 196-201 | — | Loads Quint internals from `dist/src/parsing/...` via `require` to validate invariant names. Fragile on a Quint upgrade; `quint typecheck --invariant` would fail anyway on a missing name. | Delete `validateQuintModelMetadata`'s parser use; let `quint` report it. | low |
| 6 | 164-170 | B1 | Retries a silent SIGSEGV/SIGILL once. | Keep only if CI history shows the crash; otherwise delete. Owner/CI question. | low |
| 7 | 232, 236 | T10 | Scenario and witness existence checked by regex over `.qnt` text. | `quint test --match` fails on a missing `run`; delete the regex check. | low |
| 8 | 98-110, 153-155 | C3 | `filesWithin`, `relativePath`, `sha256`, `readJson`. | `scripts/lib/{fs,hash,json}.ts`; `check-lemma.ts` imports from there rather than from the Quint lib. | none |

## Proposed end state
`scripts/quint-lib.ts` ≈ 90 lines: `loadModels()` (manifest read + duplicate/path checks), `quintModelOptions`, `detectedCounterexample`, `missingQuintScenarios`. Source enumeration lives with the refinement harnesses; generic fs/hash/json helpers in `scripts/lib/`. `quint-checker.test.mjs` cases that assert `runtimeScriptPaths`/`sourceRoots` contents (T1) are deleted; the checker is proven by `npm run quint:check` passing.
