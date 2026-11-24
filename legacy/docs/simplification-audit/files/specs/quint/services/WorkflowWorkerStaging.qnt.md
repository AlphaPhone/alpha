# specs/quint/services/WorkflowWorkerStaging.qnt
- Lines: 69 | Kind: Quint model (live; models a build script, not product code) | Verdict: DELETE model + harness `refinement/services/workflow-worker-staging.mjs`; MERGE the useful cases into one integration test of `scripts/workflow-worker-artifact.ts`
- Covers: staging the workflow worker artifact into Android assets: refuse corrupt/hash-mismatched/symlinked/overlay inputs and keep the previous target; restore on publish refusal; leave a backup when restore or cleanup fails. Duplicates: `test/quint-workflow-worker-staging.test.mjs` (runs this harness); the real gate is `npm run agent:build-workflow-worker` + `agent:stage-android` in the Android build. Callers/importers: `quint:check`; `refinement/services/workflow-worker-staging.mjs` (aggregate `services/index.mjs:49,81`, obligation `:106`); `test/quint-workflow-worker-staging.test.mjs`; mentioned in `specs/quint/develop-state-review.md`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | §2.11 | Sources are `scripts/workflow-worker-artifact.ts` and `scripts/stage-workflow-worker.ts`: build tooling. This is why `scripts/**` edits trigger formal CI. The owner keeps "models of live product code"; the research treatment is "drop models of build scripts (their e2e test is the build)". | Delete model and manifest entry. | Low (no product behaviour) |
| 2 | harness | — | The harness is a good integration test: it imports the real `stageWorkerArtifact`/`verifyWorkerArtifact` and drives them on a temp directory with `test/fixtures/workflow-worker-assets.mjs`. | Move its scenarios (corrupt kinds → refusal keeps previous; publish refusal restores; restore/cleanup refusal leaves backup) into `test/workflow-worker-staging.test.mjs` without `checkTraces`; delete the Quint wrapper. | Low |
| 3 | 10-11 | — | Seven corruption kinds and six faults; the integration test can keep one case per error message (the harness's `qualityErrors` map). | Carry those seven + four fault cases. | — |

## Proposed end state
No Quint model. One integration test file (moved from the harness) calls the real staging script functions on a temp
tree; it runs in the scripts/Android-build lane. `test/fixtures/workflow-worker-assets.mjs` survives as its fixture.
