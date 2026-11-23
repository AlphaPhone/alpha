# scripts/check-quint-refinement.ts
- Lines: 217 | Kind: formal-method runner (drives `specs/quint/refinement/<family>/index.mjs` trace campaigns and builds a model-coverage report) | Verdict: MOVE to `specs/quint/refinement/run.mjs` + SIMPLIFY (drop legacy family, receipts and rehash)
- Covers: for each family (application, services, native, composition, legacy) runs the adapters, then reports per Quint model whether a passing, source-bound trace receipt exists and which state fields/actions were never exercised; fails when a runtime model lacks current trace evidence. Callers/importers: `package.json` `quint:refinement`; `.github/workflows/browser.yml:214` (`--families=composition` only); `specs/quint/refinement/README.md:20`. Imports `specs/quint/refinement/check-traces.mjs` (`verifyRefinementReceiptInputs`) and `model-state.mjs`. **Only the composition family runs in CI through this driver**; the other families' campaigns run through host tests (research tests-host P3: per-model replays plus aggregates, T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 67, 82, 152-154, 195-201 | P6, A1 | `legacy` family runner, `legacy/manifest.json` input, `tsImport` special case for legacy, and the "legacy excluded unless requested" coverage rules. D11 retires `specs/quint/legacy`. | Delete all legacy handling with the legacy family. | Low once legacy is retired. |
| 2 | 79-85, 106-126, 203-207 | B5 | Reporting-input hashes before/after, atomic `.progress.json` checkpoints (`publish` + `checkpoint`), `reportingInputsUnchanged`. No reader of `summary.json.progress.json` exists (`git grep progress.json`: only this file). | Delete checkpoints and rehash; write one summary (or just print). | None. |
| 3 | 138-145 | A8 | "pending" status for a family whose `index.mjs` does not exist ("still being implemented"): all five exist. | Throw on a missing module. | None. |
| 4 | 170-197 | - | Model coverage computation (`modelStateInventory`, `traceActionCoverage`, unobserved fields): the substance; keep. It depends on receipts with `sourceHashesAfter` keyed by model path - that is harness-side T10 machinery and shrinks as harnesses import modules instead of hashing sources. | Keep; simplify when receipts lose source hashing. | Medium (cross-file with refinement harness port). |
| 5 | 212 | A8 | Always appends a fixed prose "unbounded implementation refinement" obligation. | Put it in `specs/quint/refinement/README.md`. | None. |
| 6 | 61-77 | C3 | Hand-written `--families=`/`--out=` parsing. | `node:util parseArgs`. | None. |
| 7 | whole | T4, P1 | Application/services/native campaigns are also run by host tests per model. | Decide one runner: either `npm test` host tests or this driver (preferred: this driver, one CI job, path-filtered on `specs/quint/**` + the product paths each family imports). | Medium: CI restructuring. |

## Proposed end state
`specs/quint/refinement/run.mjs` (~90 lines): run requested families, compute per-model trace coverage, print a table,
exit non-zero when a runtime model is unverified. No legacy, no progress/receipt files, no rehash. One CI job runs all
runtime families once; per-model host-test replays of the same campaigns are deleted (T4).
