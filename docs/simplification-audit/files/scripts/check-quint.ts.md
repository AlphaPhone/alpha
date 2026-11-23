# scripts/check-quint.ts
- Lines: 249 | Kind: formal-method runner (Quint typecheck / scenarios / simulation / witnesses / Apalache-TLC verify / temporal / compare over every manifest model) | Verdict: KEEP + SIMPLIFY (drop receipts, canaries, rehash, home-grown process supervision)
- Covers: every live Quint model typechecks, its declared scenarios all execute and pass, sampled simulation holds the invariant, declared witnesses are reachable, and (CI lane) bounded verification / temporal / known-violation comparisons hold. This is the Quint gate the owner wants at 100 %. Callers/importers: `package.json` `quint:check` (inside `verify`), `quint:verify|temporal|compare` (used by `.github/workflows/quint-model-check.yml:45-54`), `quint:typecheck|test|simulate` (no caller: research 2.16); `scripts/ci/check-changed-models.ts:93` spawns it per model/phase and **re-validates its JSON receipt** (`evidence.passed`, `inputHashes`, `modelSha256`); `scripts/ci/affected.ts:26` (path rule); tests `quint-checker.test.mjs` (copies runner into temp repo), `quint-changed-models.test.mjs`, `ci-affected.test.mjs` (tooling tests, T5). Imports `quint-lib.ts` (`loadModels`, `quintModelOptions`, `detectedCounterexample`, `missingQuintScenarios`, `runQuintChecker`, `sha256`, `readJson`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 40-44, 61-93, 155-158, 235-248 | B5 | Receipt with `inputHashes` over package-lock, scripts, every model and every manifest `sources` entry; written "running" first, rehashed in `finally` ("Checker input changed during run"); per-run `modelSha256` before/after. Only consumer: `ci/check-changed-models.ts` receipt re-validation. | Delete receipt + rehash here and the receipt check in `check-changed-models.ts` (use exit code). Keep a plain PASS/FAIL line per model/phase. | Low; `quint-checker.test.mjs`/`quint-changed-models.test.mjs` change. |
| 2 | 42-43 | P6 | `inputPaths` includes `specs/quint/legacy/manifest.json`; `loadModels()` loads the legacy family (forces `quint:prepare-history` network fetch in `verify`). | Drop with legacy retirement (D11). | Low after retirement. |
| 3 | 96-141 | B5, C3 | 45-line process supervisor (detached group, Windows `taskkill`, 8 MiB cap, SIGTERM->SIGKILL, signal forwarding). | `spawnSync(process.execPath, argv, {timeout, maxBuffer, killSignal:'SIGKILL'})`; Windows is not a supported dev host (`check-quint` runs in CI on Linux and on macOS). | Low; Apalache server child processes are separate (`--server-endpoint`). |
| 4 | 203-230 | B5 | Two self-test canaries per `check` run (a throwaway model must produce a counterexample / a failing scenario) - testing Quint itself (T5). | Delete. `missingQuintScenarios` already catches silently skipped scenarios; Quint is pinned by the lockfile. | Low. |
| 5 | 12-31 | C3 | Hand-rolled `value()` option parser with overloads; `positiveInteger`. | `node:util parseArgs`. | None. |
| 6 | 8, 63-65 | A7 | `typecheck`, `test`, `simulate` commands are subsets of `check` and have no caller (package aliases unused). | Remove the aliases; keep the commands only if `check-changed-models` needs per-phase runs (it spawns `proofPhases(model)` = verify/temporal/compare). | None. |
| 7 | 144 | C6 | Apalache version `0.62.4` hard-coded in an argv string. | Read from one constant/config next to `specs/quint/tlc.json`. | None. |
| 8 | quint-lib 164-170 | B5 | `runQuintChecker` retries a silent SIGSEGV/SIGILL once. That works around a real flaky crash; keep with a comment naming it, or remove if the crash no longer reproduces. | Owner/CI evidence. | Low. |

## Proposed end state
~110 lines: parse options, load live (non-legacy) models, per model run typecheck/scenarios/simulation/witnesses or
the selected verify/temporal/compare phase with `spawnSync` and a timeout, print PASS/FAIL, exit code. `npm run verify`
runs `quint:check`; `quint-model-check.yml` runs verify/temporal/compare only for changed models (selected by
`ci/check-changed-models.ts` reduced to a `--models=` list, research §3). No receipts, canaries or rehash.
