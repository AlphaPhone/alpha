# test/apk-keyboard-dictation.test.mjs
- Lines: 28 | Kind: tooling (release gate `distributionProblems`) | Verdict: MERGE into `test/tooling/apk-verify-audit.test.ts`
- Covers: the voice keyboard service is admitted only in the launcher (home) build, bound by `BIND_INPUT_METHOD`, with the input-method action and metadata. Duplicates: `test/aosp-fresh-presets.test.py` test 3 cross-checks the launcher manifest service from source (to be deleted). Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-23 | C5 | Copy of the aapt manifest template. | Shared builder. | none |
| 2 | 24-28 | - | Real release-gate cases. | Keep. | none |

## Proposed end state
Rows in the shared exported-component table.
