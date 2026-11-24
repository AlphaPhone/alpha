# test/google-browser-auth.test.mjs
- Lines: 54 | Kind: re-run of the upstream sign-in suite plus an Alpha overlay of forked upstream test files (`test/fixtures/google-browser-auth/**`) against the patched native sources | Verdict: SIMPLIFY now (one run, no hash ceremony); upstream the overlay and DELETE (D14 follow-up)
- Covers: the shared Google browser sign-in (Android `packages/auth/android`) preserves lifecycle and credential ownership, including Alpha's extra browser cases. Duplicates: upstream's own `native-sign-in.test.mjs` (the first run is exactly that suite). Callers/importers: none. Runtime: 360 s budget; `preparePatchedNative`, several recursive copies out of `vendor/eliza`, two child `node --test` runs (research `tests-host.md:260`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 50 | T5, T4 | Runs the pinned upstream suite unchanged. That is upstream's CI. | Delete the first `runSuite`. | none |
| 2 | 21-30 | B5 | sha256 pins of upstream files (`upstream-base.json`) to force a rebase of forked tests. | Drop once the overlay is upstreamed; until then keep (it is the only signal that a fork went stale). | low |
| 3 | 19-20 | T5 | Alpha keeps forked copies of upstream test files. | Upstream follow-up: land the browser-lifecycle and credential-owner cases upstream, then delete this test and the fixture folder. | medium: until then these are the only Alpha-specific sign-in cases |
| 4 | 33-39 | — | Copies four vendor trees into a temp root to satisfy the upstream suite's layout. | Gone with the delete. | none |
| 5 | 40-41 | C3 | Inline `NODE_TEST_CONTEXT` deletion (copy of `child-suite.mjs`). | Gone. | none |

## Proposed end state
Short term: one overlay run, about 30 lines, in a sign-in lane filtered to `vendor` pin, native patch manifest and the
overlay folder. Long term: deleted after the overlay cases are upstream and the pin advances.
