# test/quint-scan-conformance.test.mjs
- Lines: 11 | Kind: Quint refinement wrapper | Verdict: MERGE into `test/quint/refinement.test.mjs`
- Covers: Scan export model preserves the explicit draft through the shared controller (`specs/quint/services/scan-source-conformance.mjs`, vm over `prototype/scan-document.ts` and upstream `plugin-native-camera`). Duplicates: Not in an aggregate. Scan dialogs are also replayed by `quint-scan-review-dialogs`. Callers/importers: npm test (`scripts/run-node-tests.ts` glob `test/*.test.mjs`), so `npm run verify` and the `browser.yml` verify job; `quint:conformance` alias (package.json:69); `specs/quint/refinement/services/README.md:42`..

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-11 | T9 | Spawns the harness as a standalone script and asserts exit 0; assertions inside the child are invisible to node:test. | Export a `checkScanSourceConformance()` from the harness and register it in the runner. | Low |
| 2 | driver | T2/T10 | Harness evaluates scan source in a vm. | PORT to `sourceModule` imports. | Medium |

## Proposed end state
- Runner row; no child process.
