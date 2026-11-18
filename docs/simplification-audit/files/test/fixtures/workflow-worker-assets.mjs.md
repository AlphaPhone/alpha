# test/fixtures/workflow-worker-assets.mjs
- Lines: 18 | Kind: tooling fixture (writes a synthetic workflow-worker payload and manifest using the real `workerHash`) | Verdict: KEEP
- Covers: a minimal staged worker tree whose manifest matches `scripts/workflow-worker-artifact.ts` hashing. Duplicates: none. Callers/importers: `test/workflow-worker-assets.test.mjs` (research: merge into release-build-aosp integration) and live harness `specs/quint/refinement/services/workflow-worker-staging.mjs` (imports it and pins it as a source, line 176).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-8 | — | The file list mirrors what the stager expects; it would drift if the worker gains a package. | Acceptable for a fixture; derive from the stager's own list if it exports one. | low |
| 2 | 15 | — | Fixed `a`/`b` digests are fine for synthetic data. | Keep. | none |

## Proposed end state
Unchanged, kept with the release-build integration and the `workflow-worker-staging` Quint driver.
