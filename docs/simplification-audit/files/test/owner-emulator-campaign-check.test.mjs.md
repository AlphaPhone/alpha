# test/owner-emulator-campaign-check.test.mjs
- Lines: 62 | Kind: tooling + inventory (imports `scripts/owner/emulator-campaign-check.ts`, `scripts/android-instrumentation.ts`, `scripts/ci/emulator-suite.ts`; `analyse` regex-reads CI scripts and instrumentation sources at import time) | Verdict: DELETE (with `scripts/owner/emulator-campaign-check.ts`)
- Covers: every class issue #676 lists has an `*InstrumentedTest` source, hosted-suite mapping is derived from the suites' own plans, campaign batches parse with the runner's argument parser, and the dispatch plan only pins an exact SHA. Duplicates: the instrumentation registry is already exercised by `test/android-instrumentation-runner.test.mjs`; the batch/class bookkeeping restates `CLASS_REGISTRY`. Callers/importers: `npm test` glob only; the script is called only by this test (scripts report `files/scripts/owner/emulator-campaign-check.ts.md`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-3 | A8 | Header names an issue and an H-31 task code. | Gone with the file. | None |
| 2 | 10, 13-17 | T1 / inventory | `analyse(ROOT, …)` and `instrumentedSources` read source files and match class names: a file-list check. Breaks whenever an instrumentation class is deleted (several were deleted on this branch). | Delete. | Low |
| 3 | 19-27 | T1 | Hosted-suite mapping is computed by regex over `scripts/ci/*.py` and suite plan text. | Delete. | Low |
| 4 | 50-62 | T5 | Asserts a printed `gh workflow run` plan (workflow names, `-R eliza-research/alphaphone`): a test of a one-off planning aid. | Delete. | Low |

## Proposed end state
File deleted with the script once the owner confirms the #676 emulator campaign no longer needs the planning aid. Batch parsing that matters for real runs stays covered by `test/android-instrumentation-runner.test.mjs` (`parseInstrumentationArgs`).
