# test/app-update-candidate.test.mjs
- Lines: 267 | Kind: tooling (imports `scripts/app-update-candidate.ts` with an injected GitHub/archive fixture; spawns the CLI once) + workflow-YAML evaluation (last test) | Verdict: MERGE tests 1-8 into `test/tooling/release-signing.test.ts` (update-candidate section); DELETE test 9 (workflow YAML)
- Covers: candidate version numbering above every retained asset and committed/public floor; retired-channel floor; refusals before writing (wrong event/ref/workflow/run identity, malformed inventories, SDK change); receipt binds archive bytes and source freeze; native input receipt and artifact inventory; archive-size measurement; refusal of mocks/Cloud/signed/changed APKs; floor advancing during build. Duplicates: the Quint replay `specs/quint/refinement/services/app-update-candidate.mjs` drives the same `main` with the same fixture (`test/fixtures/app-update-candidate.mjs`); `test/quint-app-update-candidate.test.mjs` runs that replay. Callers/importers: `npm test`; script called by `resident-android.yml:252,395,411`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 209-267 | T1, T5 | Parses `.github/workflows/resident-android.yml` and evaluates its `if`/`env`/concurrency expressions with `new Function`: a test of workflow text and of a GitHub expression emulator. | Delete. Workflow behaviour is verified by running the workflow. | Low: concurrency-group mistakes would show in CI runs, not here. |
| 2 | 13-207 | T4 | Partial overlap with the Quint replay (version floor and receipt actions). | Keep the refusal tables here (more cases than the replay); keep the replay for interleavings. | none |
| 3 | 9 | - | Fixture `test/fixtures/app-update-candidate.mjs` is shared with the Quint replay, so it survives. | none | none |

## Proposed end state
About 200 lines in `test/tooling/release-signing.test.ts` ("update candidate"); no workflow-YAML evaluation.
