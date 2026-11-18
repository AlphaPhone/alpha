# test/qualify-head.test.mjs
- Lines: 69 | Kind: tooling unit/integration (real `dirtyPaths`, `parseQualifyArgs`, `readCiArchive`, `recordCandidate` from `scripts/qualify-head.ts`, with real git in temp repos) | Verdict: DELETE together with `scripts/qualify-head.ts` (scripts review: owner decision, "local re-run of CI; only tests import it")
- Covers: local CI-qualification records: porcelain dirty-path parsing, `--candidate-archive` argument rules, resident campaign evidence bound by APK sha256 to a local or named CI archive. Duplicates: parts of `test/pilot-units.test.mjs`. Callers/importers: `npm test` glob only; `scripts/qualify-head.ts` is imported only by tests (`qualify-head`, `pilot-units`, `docs-links`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | A7 | Tests a 465-line script that no npm script, workflow or other script runs. | Delete both; also drop the `qualify-head` parts of `pilot-units.test.mjs` and the `docs-links` reference. | Low |
| 2 | 15-29 | C3 | Porcelain `-z` parser is a micro-helper duplicated across scripts (`git()` wrappers, 17x). | If kept, move to `scripts/lib/git.ts` and test there. | Low |
| 3 | 38-69 | owner | Binds manual resident instrumentation records (`android-resident-instrumentation.ts`) to APK hashes; that runner is itself an owner question (manual device campaign). | Decide with that runner. | — |

## Proposed end state
Deleted with `scripts/qualify-head.ts` unless the owner still runs `qualify-head` by hand; then it moves to
`test/tooling/ci-selection.test.ts` with only the argument and archive-binding cases.
