# test/embedding-workflow-forwarding.test.mjs
- Lines: 60 | Kind: source-text over `.github/workflows/resident-android.yml` (regex-extracts a step's `run:` block and executes it under bash with `python3`/`node`/`bun` shimmed; evaluates job `if:` expressions with `new Function`) and over `scripts/ci/verify-cloud-signing-input.sh` | Verdict: DELETE
- Covers: the resident workflow stages once, archives distribution and test-mocks builds, has no runtime-profile input, and upload-only mode cannot run APK/native jobs. Duplicates: none. Callers/importers: `npm test`. Research row 725 ("runs a Python unittest") is wrong: there is no Python here.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-8, 41-47 | T1, T5 | Tests of workflow YAML text; GitHub Actions expressions re-evaluated as JavaScript (`github.event_name` -> `event`), which is not GitHub's evaluator. | Delete. The CI restructure (P1/P5) will rewrite this workflow anyway. | Low. |
| 2 | 30-39 | T1, A8 | Negative regexes for retired inputs (`runtime_profile`, `local_embeddings`, `--verify-cloud`): tombstone guards. | Delete. | None. |
| 3 | 34-35 | T1 | Pins the artifact name in both the workflow and a shell script. A real coupling, but the signing job itself fails if the name drifts. | Delete; if wanted, `actionlint` plus one shared env var for the artifact name. | Low. |

## Proposed end state
Deleted. Artifact-name coupling handled by defining the name once in the workflow (`env:`) and reading it in the shell script.
