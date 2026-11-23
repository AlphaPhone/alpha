# test/apk-alpha-tile-policy.test.mjs
- Lines: 40 | Kind: tooling (release gate `distributionProblems`) | Verdict: MERGE into `test/tooling/apk-verify-audit.test.ts`
- Covers: the Quick Settings tile is admitted only as an Android-bound service with the QS_TILE action, and must ship disabled while its target `AlphaAssistActivity` is disabled or absent (P-78, kept per D7). Duplicates: replaces the source-text manifest checks of `test/aosp-cloud-power-defaults.test.mjs` test 3 on the built APK. Callers/importers: `npm test`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-29 | C5 | Third copy of the aapt manifest template. | Shared builder. | none |
| 2 | 30-40 | - | Real release-gate cases. | Keep. | none |

## Proposed end state
Rows in the shared exported-component table.
