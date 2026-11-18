# test/fixtures/git-fixture.mjs
- Lines: 11 | Kind: support helper (hermetic `git` for fixture repos) | Verdict: KEEP (the one test git helper)
- Covers: running git with global/system config, signing and hooks disabled and a fixed identity/branch. Duplicates: `test/fixtures/app-update-candidate.mjs:16-17` (non-hermetic local `git`/`commit`), and the ~17 `git()` wrappers in scripts (C3). Callers/importers: `test/agent-identity`, `agent-model-selection`, `android-build-path`, `android-dependency-fingerprint`, `aosp-secure-camera`, `aosp-staging-patches`, `ci-affected`, `client-feature-preparation`, `quint-tla-inventory` tests, and Quint `specs/quint/refinement/services/client-feature-publication.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-7 | - | Correct and minimal. | none | - |
| 2 | - | C3 | Other fixtures and test files that shell out to git should use this. | Replace the copies. | none |

## Proposed end state
`test/support/git.mjs`, used by every tooling test that builds a repo.
