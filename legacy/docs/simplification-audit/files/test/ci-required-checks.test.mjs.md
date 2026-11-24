# test/ci-required-checks.test.mjs
- Lines: 100 | Kind: tooling unit (imports `scripts/ci/required-result.ts` and `affected.ts`) + source-text (regexes over `browser.yml`, `android.yml`, `resident-android.yml`, `playwright.config.ts`) | Verdict: MERGE lines 8-37 into the CI-selection integration (`ci-affected` successor); DELETE 39-89; KEEP 91-100 only as part of the workflow lint
- Covers: the required aggregate fails a selected lane that did not succeed and passes skipped unselected lanes; production spec regex agrees between `playwright.config.ts` and `affected.ts`; workflow concurrency groups, triggers and aggregate `needs`; committed ruleset requires exactly the three stable check names that exist as job names. Duplicates: `ci-affected.test.mjs` (`browserPlan`), `ci-ruleset-readback.test.mjs` (ruleset contents). Callers/importers: `npm test` glob; `required-result.ts` runs in `android.yml`/`browser.yml` aggregate jobs.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-19 | - | `requiredResult` decides whether merges are blocked; includes an injection refusal (`build=$(id)`). Keep. | Move into the CI-selection file. | - |
| 2 | 21-37 | T1/C6 | Two copies of `productionSpec` regex (config and script) kept in sync by regex-reading the config. | Export it from one module and import it in `playwright.config.ts`; then delete the sync check. | Low |
| 3 | 39-89 | T1 | ~25 regexes over workflow YAML (concurrency groups, `cancel-in-progress`, step names, env values). They freeze the pipeline that P1-P5 are about to restructure. | Delete. | Low: concurrency mistakes show up in Actions, not silently. |
| 4 | 91-100 | T1 (real rule) | Required check names in the ruleset must be job names in workflows, or merges silently stop being gated. | Keep as one rule in `scripts/ci/check-workflows.ts` (see `ci-emulator-evidence` report). | Medium if dropped |

## Proposed end state
`requiredResult` cases join the CI-selection integration; `productionSpec` has one owner; the ruleset/job-name rule
lives in the workflow lint. Workflow-text pins are deleted.
